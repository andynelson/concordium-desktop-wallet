# This script allows to generate proposals from a csv file exported from Excel.
#
# This script requires python 3.6 or above
#
# Note: The script uses dateutil and base58, which can be installed using 
# "pip install python-dateutil"
# "pip install base58"
from abc import abstractproperty
import sys
import json
import csv
import os
import re
import argparse
from decimal import *
from datetime import datetime,date,time
from typing import Any, List
from dateutil.relativedelta import relativedelta
from base58 import b58decode_check

num_releases = 10
initial_release_time = datetime.fromisoformat("2022-07-26T14:00:00+01:00")
first_rem_release_time = datetime.fromisoformat("2022-08-26T14:00:00+01:00")
welcome_release_time = datetime.fromisoformat("2022-07-15T14:00:00+01:00")
csv_delimiter = ','
thousands_sep = ','
decimal_sep = '.'
assert len(csv_delimiter) == 1 and len(thousands_sep) == 1 and len(decimal_sep) == 1 and thousands_sep != decimal_sep
assert initial_release_time < first_rem_release_time

# proposals expire 2 hours from now
transaction_expiry = datetime.now() + relativedelta(hours =+ 2) 
# If regular releases are before earliest_release_time, they get combined into one at that time.
# earliest_release_time = 14:00 CET tomorrow.
earliest_release_time = datetime.combine(date.today(), time.fromisoformat("14:00:00+01:00")) + relativedelta(days =+ 1)
assert earliest_release_time < welcome_release_time and earliest_release_time < initial_release_time

# Class for storing transfer amounts. 
class TransferAmount:

	max_amount:int = 18446744073709551615
	amount_regex:str = r"^[0-9]+([.][0-9]{1,6})?$"
	amount_regex_with_1000_sep:str = r"^[0-9]{1,3}([,][0-9]{3})*([.][0-9]{1,6})?$"

	#basic constructor where amount is in microGTU
	def __init__(self, amount: int) -> None:
		if not self.__in_valid_range(amount):
			raise ValueError(f"Amount not in valid range (0,{self.max_amount}]")
		self.__amount = amount

	#create a transfer amount from a transfer string
	@classmethod
	def from_string(cls,amount_string:str, decimal_sep:str, thousands_sep: str) -> 'TransferAmount':
		translation_table = {ord(thousands_sep) : ',', ord(decimal_sep): '.'}
		amount_org_string = amount_string	
		if not bool(re.match(cls.amount_regex, amount_string)) and not bool(re.match(cls.amount_regex_with_1000_sep, amount_string)):
			raise ValueError(f"Amount {amount_org_string} is not a valid amount string.")
		amount_string = amount_string.replace(',', '')
		try: 
			amount = int(Decimal(amount_string) * 1000000)
		except: #this should not happen
			raise ValueError("Amount stringn {amount_org_string} could not be converted.")
		return TransferAmount(amount)

	def __str__(self):
		return f"{self.__amount} microGTU"

	def __in_valid_range(self,x):
		return x > 0 and x <= self.max_amount

	#returns amount in GTU
	def get_GTU(self) -> Decimal:
		return Decimal(self.__amount)/Decimal(1000000)

	#returns amount in microGTU
	def get_micro_GTU(self) -> int:
		return self.__amount

	#equality check
	def __eq__(self, y:'TransferAmount'):
		return self.__amount == y.__amount

	#add two amounts
	def __add__(self,y:'TransferAmount') -> 'TransferAmount':
		return TransferAmount(self.__amount + y.__amount)

	def split_amount(self,n:int) -> List['TransferAmount']:
		if n <=0:
			raise AssertionError(f"Cannot split into {n} parts")
		elif n == 1:
			return [TransferAmount(self.__amount)]
		else:
			step_amount = self.__amount // n
			last_amount = self.__amount - (n-1)*step_amount
			if step_amount <= 0:
				raise AssertionError(f"Cannot split {self.__amount} into {n} parts, amount is too small")
			amount_list = [TransferAmount(step_amount) for _ in range(n-1)]
			amount_list.append(TransferAmount(last_amount))
			return amount_list
		
# Class for generating scheduled pre-proposals and saving them as json files.
# A pre-proposal is a proposal with empty nonce, energy and fee amounts.
# The desktop wallet can convert them to proper proposals.
class ScheduledPreProposal:
	# Initialize pre-proposal with sender, receiver, and expiry time, with empty schedule
	def __init__(self, sender_address: str, receiver_address: str, expiry: datetime):
		self.data = {
			"sender": sender_address,
			"nonce": "", # filled by desktop wallet
			"energyAmount": "", # filled by desktop wallet
			"estimatedFee": "", # filled by desktop wallet,
			"expiry": {
				"@type": "bigint",
				"value": int(expiry.timestamp())
			},
			"transactionKind": 19,
			"payload": {
				"toAddress": receiver_address,
				"schedule": [] # initially empty, filled by add_release
			},
			"signatures": {}
		}

	# Add a release to the schedule.
	def add_release(self, amount: TransferAmount, release_time: datetime):
		release = {
			"amount": amount.get_micro_GTU(),
			"timestamp": int(release_time.timestamp()) * 1000 # multiply by 1000 since timestamps here are in milliseconds
		} 
		self.data["payload"]["schedule"].append(release)

	# Write pre-proposal to json file with given filename.
	def write_json(self, filename: str):
		with open(filename, 'w') as outFile:
			json.dump(self.data, outFile, indent=4)


def add_releases(pre_proposal,inital_amount_str:str,rem_amount_string:str,release_times,skipped_releases):
	# Remove thousands separator and trailing/leading whitespaces (if any)
	try:	
		initial_amount = TransferAmount.from_string(inital_amount_str, decimal_sep, thousands_sep)
		rem_amount = TransferAmount.from_string(rem_amount_string, decimal_sep, thousands_sep)
	except ValueError as error:
		print(f"Error: {error}")
		sys.exit(2)
	if len(release_times) == 1:
		# if there is only one release, amount is sum of initial and remaining amount
		pre_proposal.add_release(initial_amount + rem_amount, release_times[0])
	else:
		# if there are more releases, first compute amounts according to original schedule (i.e., assume no skipped releases)
		# in each remaining step give fraction of amount, rounded down
		# potentially give more in last release				
		#Split amount into list
		amount_list = rem_amount.split_amount(num_releases-1)
		#Add up skipped releases
		first_release = initial_amount
		for i in range(skipped_releases):
			first_release  = first_release + amount_list[i]
			pre_proposal.add_release(first_release, release_times[0])
		#Add remaining releases
		for i in range(skipped_releases, len(amount_list)) :
			pre_proposal.add_release(amount_list[i], release_times[i-skipped_releases])
					
def add_welcome_release(pre_proposal,amount_str:str):
	# Remove thousands separator and trailing/leading whitespaces (if any)
	try:
		amount = TransferAmount.from_string(amount_str, decimal_sep, thousands_sep)
	except ValueError as error:
		print(f"Error: {error}")
		sys.exit(2)
	pre_proposal.add_release(amount, welcome_release_time)

# Main function
def main():
	parser = argparse.ArgumentParser(description="Generate pre-proposals from the csv file \"input_csv\".\n"\
		"For each row in the csv file, a json file with the corresponding pre-proposal is generated in the same folder.\n"
		"\n"
		"The expected format of that file is a UTF-8 csv file with:\n"\
		"One row for each transfer, columns separated by ','.\n"\
		"The first column contains the sender address, the second one the receiver address.\n"\
		"The third column contains the amount of the first release in GTU.\n"\
		"The fourth column contains the total amount of remaining releases in GTU (if not generating welcome transfers).\n"\
		f"GTU amounts must be formatted as decimals with 6 digits after the decimal dot '{decimal_sep}' and possibly using '{thousands_sep}' as thousands separator.\n"\
		"\n"\
		"If the optional argument \"--welcome\" is present, the tool generates pre-proposals for welcome transfers.\n"\
		"These only have one release, and thus expect a csv file with only 3 columns: sender, receiver, and amount.\n"
		"\n"
		"The release schedules are hard-coded in this script.", formatter_class=argparse.RawDescriptionHelpFormatter)
	parser.add_argument("input_csv", type=str, help="Filename of a csv file to generate pre-proposals from.")
	parser.add_argument("--welcome", help="Generate welcome transfers with only one release.", action="store_true")
	args = parser.parse_args()
	
	is_welcome = args.welcome
	csv_input_file = args.input_csv
	#Output files contain the csv_input_file name 
	json_output_prefix = "pre-proposal_" + os.path.splitext(os.path.basename(csv_input_file))[0] + "_"

	# Build release schedule for normal transfers
	# Normal schedule consists of num_releases, with first one at initial_release_time,
	# and the remaining ones one month after each other, starting with first_rem_release_time.
	#
	# If the transfer is delayed, some realeases can be in the past. In that case,
	# combine all releases before earliest_release_time into one release at that time.
	if not is_welcome:
		release_times = []
		
		if initial_release_time >= earliest_release_time:
			release_times.append(initial_release_time)
		else:
			release_times.append(earliest_release_time)

		for i in range(num_releases - 1):
			# remaining realeses are i month after first remaining release
			planned_release_time = first_rem_release_time + relativedelta(months =+ i)

		# Only add release if not before earliest_release_time.
		# Note that earliest_release_time will already be in list since initial_release_time < first_rem_release_time.
			if planned_release_time >= earliest_release_time:
				release_times.append(planned_release_time)
	
		skipped_releases = num_releases - len(release_times) # number of releases to be combined into the initial release

	# read csv file
	try:
		with open(csv_input_file, newline='', encoding='utf-8-sig') as csvfile:
			reader = csv.reader(csvfile, delimiter=csv_delimiter)
			for row_number,row_data in enumerate(reader):
				#Ensure we have the right number of columns
				if not is_welcome and len(row_data) != 4:
					print(f"Error: Incorrect file format. Each row must contains exactly 4 entires. Row {row_number+1} contains {len(row_data)}.")
					sys.exit(2)
				elif is_welcome and len(row_data) != 3:
					print(f"Error: Incorrect file format. Each row must contains exactly 3 entires. Row {row_number+1} contains {len(row_data)}.")
					sys.exit(2)
				#Read sender and receiver address
				senderAddress = row_data[0]
				try:
					b58decode_check(senderAddress)
				except:
					print(f"Encountered an invalid sender address: \"{senderAddress}\" at row {row_number+1}.")
					sys.exit(2)
				receiverAddress = row_data[1]
				try:
					b58decode_check(receiverAddress)
				except:
					print(f"Encountered an invalid receiver address: \"{receiverAddress}\" at row {row_number+1}.")
					sys.exit(2)	
				#Generate pre schedule proposal
				pre_proposal = ScheduledPreProposal(senderAddress, receiverAddress, transaction_expiry)		
				#Add releases
				if is_welcome:
					add_welcome_release(pre_proposal,row_data[2])
				else:
					add_releases(pre_proposal,row_data[2],row_data[3],release_times,skipped_releases)
				#Write json file
				out_file_name = json_output_prefix + str(row_number+1).zfill(3) + ".json"
				try:
					pre_proposal.write_json(out_file_name)
				except IOError:
					print(f"Error writing file \"{out_file_name}\".")
					sys.exit(3)
	except IOError as e:
		print(f"Error reading file \"{csv_input_file}\": {e}")
		sys.exit(3)

	print(f"Successfully generated {row_number+1} proposals.")

if __name__ == "__main__":
	main()