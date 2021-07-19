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
from typing import Any, List, Tuple
from dateutil.relativedelta import relativedelta
from base58 import b58decode_check

num_releases = 10
welcome_release_time = datetime.fromisoformat("2021-08-15T14:00:00+01:00")
initial_release_time = datetime.fromisoformat("2021-08-26T14:00:00+01:00")
first_rem_release_time = datetime.fromisoformat("2021-09-26T14:00:00+01:00") #Must be after the initial release
csv_delimiter = ','
thousands_sep = ','
decimal_sep = '.'
assert len(csv_delimiter) == 1 and len(thousands_sep) == 1 and len(decimal_sep) == 1 and thousands_sep != decimal_sep

# proposals expire 2 hours from now
transaction_expiry = datetime.now() + relativedelta(hours =+ 2) 
# If regular releases are before earliest_release_time, they get combined into one at that time.
# earliest_release_time = 14:00 CET tomorrow.
# This can be later than all release times, in which case all releases happen at that time.
earliest_release_time = datetime.combine(date.today(), time.fromisoformat("14:00:00+01:00")) + relativedelta(days =+ 1)


# Class for storing transfer amounts. The amounts are internally stored in microGTU
class TransferAmount:
	#max amount in microGTU
	max_amount:int = 18446744073709551615
	#regex for valid amount strings using '.' as decimal separator and ',' as thousands separator
	amount_regex:str = r"^[0-9]+([.][0-9]{1,6})?$"
	amount_regex_with_1000_sep:str = r"^[0-9]{1,3}([,][0-9]{3})*([.][0-9]{1,6})?$"

	# Creates a TransferAmount with amount microGTU
	def __init__(self, amount: int) -> None:
		if not self.__in_valid_range(amount):
			raise ValueError(f"Amount {amount} not in valid range (0,{self.max_amount}]")
		self.__amount = amount

	# Creates a TransferAmount from an amount string that represents an amount in GTU. 
	# The string must valid, i.e., satisfy amount_regex or amount_regex_with_1000_sep.
	@classmethod
	def from_string(cls, amount_string:str, decimal_sep:str, thousands_sep: str) -> 'TransferAmount':
		#Convert the separators
		translation_table = {ord(thousands_sep) : ',', ord(decimal_sep): '.'}
		amount_string = amount_string.strip()
		amount_org_string = amount_string
		#Check validity of amount string
		if not bool(re.match(cls.amount_regex, amount_string)) and not bool(re.match(cls.amount_regex_with_1000_sep, amount_string)):
			raise ValueError(f"\"{amount_org_string}\" is not a valid amount string.")
		amount_string = amount_string.replace(',', '')
		#Convert to microGTU
		try: 
			amount = int(Decimal(amount_string) * 1000000)
		except: #this should not happen
			raise ValueError("Amount string \"{amount_org_string}\" could not be converted.")
		return TransferAmount(amount)

	# String representation of a TransferAmount
	def __str__(self):
		return f"{self.__amount} microGTU"

	# Range check 
	def __in_valid_range(self,x):
		return x > 0 and x <= self.max_amount

	# Equality check
	def __eq__(self, y:'TransferAmount'):
		return self.__amount == y.__amount

	# Addition
	def __add__(self,y:'TransferAmount') -> 'TransferAmount':
		return TransferAmount(self.__amount + y.__amount)
	
	#returns amount in GTU
	def get_GTU(self) -> Decimal:
		return Decimal(self.__amount)/Decimal(1000000)

	#returns amount in microGTU
	def get_micro_GTU(self) -> int:
		return self.__amount
	
	# Split the TransferAmount into a list of n equal TransferAmounts. 
	# Each split is computed as floor(self.amount/n) with the exception
	# of the last which additionally contains the remainder.
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
		self.__data = {
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
		self.__data["payload"]["schedule"].append(release)

	# Write pre-proposal to json file with given filename.
	def write_json(self, filename: str):
		with open(filename, 'w') as outFile:
			json.dump(self.__data, outFile, indent=4)


# Read csv file and return a list with one entry for each row in csv.
def csv_to_list(filename:str, is_welcome:bool, decimal_sep:str, thousands_sep:str, csv_delimiter:str) -> List[Any]:
	result = []

	with open(filename, newline='', encoding='utf-8-sig') as csvfile:
		reader = csv.reader(csvfile, delimiter=csv_delimiter)
		for row_number,row_data in enumerate(reader, start=1): # start counting rows with 1 for error messages
			# Ensure we have the right number of columns
			if not is_welcome and len(row_data) != 4:
				raise ValueError(f"Incorrect file format. Each row must contains exactly 4 entires. Row {row_number} contains {len(row_data)}.")
			elif is_welcome and len(row_data) != 3:
				raise ValueError(f"Incorrect file format. Each row must contains exactly 3 entires. Row {row_number} contains {len(row_data)}.")
			
			# Read sender and receiver address
			senderAddress = row_data[0]
			try:
				b58decode_check(senderAddress)
			except:
				raise ValueError(f"Invalid sender address \"{senderAddress}\" in row {row_number}.")
			receiverAddress = row_data[1]
			try:
				b58decode_check(receiverAddress)
			except:
				raise ValueError(f"Invalid receiver address \"{receiverAddress}\" in row {row_number}.")
			
			# Read amounts
			if is_welcome:
				try:
					amount = TransferAmount.from_string(row_data[2], decimal_sep, thousands_sep)
				except ValueError as error:
					raise ValueError(f"In row {row_number}: {error}")

				result.append([senderAddress, receiverAddress, amount])
			else:
				try:
					initial_amount = TransferAmount.from_string(row_data[2], decimal_sep, thousands_sep)
					rem_amount = TransferAmount.from_string(row_data[3], decimal_sep, thousands_sep)
				except ValueError as error:
					raise ValueError(f"In row {row_number}: {error}")

				result.append([senderAddress, receiverAddress, initial_amount, rem_amount])

	return result

# Build the release schedule
# Returns a tuple, where the first element is a list of times of all releases,
# and the second element is the number of skipped releases.
def build_release_schedule(
	is_welcome:bool,
	w_release_time:datetime,
	i_release_time:datetime,
	f_rem_release_time:datetime,
	e_release_time:datetime,
	num_releases:int
	) -> Tuple[List[datetime],int]:
	if is_welcome:
		# Release schedule for welcome transfer is just single date
		release_times = [max(w_release_time, e_release_time)]
		return (release_times,0)
	else:
		if i_release_time > f_rem_release_time:
			raise ValueError("Initial release must be before the remaining ones")
		# Normal schedule consists of num_releases, with first one at i_release_time,
		# and the remaining ones one month after each other, starting with f_rem_release_time.
		#
		# If the transfer is delayed, some realeases can be in the past. In that case,
		# combine all releases before e_release_time into one release at that time.
		release_times = [max(i_release_time, e_release_time)]

		for i in range(num_releases - 1):
			# remaining realeses are i month after first remaining release
			planned_release_time = f_rem_release_time + relativedelta(months =+ i)

			# Only add release if after e_release_time.
			# Note that in this case, e_release_time is already in list since i_release_time < f_rem_release_time.
			if planned_release_time > e_release_time:
				release_times.append(planned_release_time)
	
		skipped_releases = num_releases - len(release_times) # number of releases to be combined into the initial release
		return (release_times,skipped_releases)

#Creates schedule proposal from a transfer and write it into a json file
def transfer_to_json(
	is_welcome:bool, 
	transfer:List[Any], 
	release_times:List[datetime], 
	num_releases:int,
	skipped_releases:int,
	transaction_expiry:datetime,
	out_file_name:str
	):
		if not is_welcome and len(transfer) != 4:
			raise ValueError(f"Incorrect length of transfer. Each transfer must contains exactly 4 entires. The transfer contains {len(transfer)} entries.")
		elif is_welcome and len(transfer) != 3:
			raise ValueError(f"Incorrect length of welcome transfer. Each welcome transfer must contains exactly 3 entires. The transfer contains {len(transfer)} entries.")
		pre_proposal = ScheduledPreProposal(transfer[0], transfer[1], transaction_expiry)
		if is_welcome:
			if len(release_times) != 1:
				raise ValueError("Welcome transfer must have exactly one release date.")
			# welcome transfer only has one amount
			amounts = [transfer[2]]
		else:
			if len(release_times) != num_releases-skipped_releases:
				raise ValueError(f"The release schedule length {len(release_times)} does not match the number of unskipped releases {num_releases-skipped_releases}.")
			# regular transfer has first initial amount, then the remaining amount split into num_releases-1 releases
			regular_amounts = [transfer[2], *transfer[3].split_amount(num_releases-1)]

			# add all skipped amounts into initial amount and put remaining ones after that in list
			initial_amount = sum(regular_amounts[1:(skipped_releases+1)], regular_amounts[0])
			amounts = [initial_amount, *regular_amounts[skipped_releases+1:]]
		# add all releases
		for i in range(len(release_times)):
			pre_proposal.add_release(amounts[i], release_times[i])
		# Write json file
		pre_proposal.write_json(out_file_name)

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

	# Build release schedule
	try:
		(release_times,skipped_releases) = build_release_schedule(
			is_welcome,welcome_release_time,
			initial_release_time,
			first_rem_release_time,
			earliest_release_time,
			num_releases)
	except ValueError as e:
		print(f"Error: {e}")
		sys.exit(2)

	
	# read csv file
	try:
		transfers = csv_to_list(csv_input_file, is_welcome, decimal_sep, thousands_sep, csv_delimiter)
	except IOError as e:
		print(f"Error reading file \"{csv_input_file}\": {e}")
		sys.exit(3)
	except ValueError as e:
		print(f"Error: {e}")
		sys.exit(2)

	# process all transfers in list
	for transfer_number, transfer in enumerate(transfers, start=1):
		out_file_name = json_output_prefix + str(transfer_number).zfill(3) + ".json"
		try:
			transfer_to_json(
				is_welcome,
				transfer,
				release_times,
				num_releases,
				skipped_releases,
				transaction_expiry,
				out_file_name
				)
		except IOError:
			print(f"Error writing file \"{out_file_name}\".")
			sys.exit(3)
		except ValueError:
			print(f"Error: {e}")
			sys.exit(2)

	print(f"Successfully generated {len(transfers)} proposals.")

if __name__ == "__main__":
	main()