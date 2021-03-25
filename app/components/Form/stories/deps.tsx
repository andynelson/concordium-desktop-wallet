import React from 'react';
import { Story, Meta } from '@storybook/react/types-6-0';

import Form, { FormProps } from '../Form';
import { futureDate } from '../util/validation';
import { maxFileSizeKb } from '../FileInput/validation';

export const {
    Checkbox,
    Input,
    Submit,
    Switch,
    TextArea,
    Timestamp,
    File,
} = Form;

export const argTypes: Meta['argTypes'] = {
    children: {
        children: {
            description:
                'Can be anything, most often sub components accessible on Form',
            control: {
                type: null,
            },
        },
    },
};

export const subcomponents: Meta['subcomponents'] = {
    'Form.Input': Input,
    'Form.TextArea': TextArea,
    'Form.Checkbox': Checkbox,
    'Form.Switch': Switch,
    'Form.Timestamp': Timestamp,
    'Form.File': File,
    'Form.Submit': Submit,
};

export const decorators = [
    (story: () => JSX.Element) => (
        <>
            <style>
                {`
                    .sb-form-wrapper {
                        max-width: 400px;
                        margin: 0 auto;
                    }
                `}
            </style>
            <div className="sb-form-wrapper">{story()}</div>
        </>
    ),
];

export const Template: Story<FormProps<unknown>> = (args) => (
    <Form {...args}>
        <Form.Input name="name" placeholder="Name" />
        <Form.Input type="email" name="email" placeholder="Email" />
        <Form.Input type="phone" name="phone" placeholder="Phone" />
        <Form.Checkbox name="terms">Agree to terms</Form.Checkbox>
        <Form.Submit>Submit</Form.Submit>
    </Form>
);

export const ValidationTemplate: Story<FormProps<unknown>> = (args) => (
    <Form {...args} onSubmit={console.log}>
        <Form.Input name="name" placeholder="Name" />
        <Form.Input
            name="email"
            type="email"
            placeholder="E-mail"
            rules={{ required: 'Email is required to sign up.' }}
        />
        <Form.File
            name="file"
            rules={{
                required: 'File is required',
                validate: maxFileSizeKb(1, 'File size too big (1kb allowed)'),
            }}
        />
        <Form.Timestamp
            name="time"
            rules={{
                required: 'Field is required',
                validate: futureDate(),
            }}
        />
        <Form.Checkbox
            name="terms"
            rules={{ required: 'You must agree to the terms' }}
        >
            Agree to terms
        </Form.Checkbox>
        <Form.Submit>Submit</Form.Submit>
    </Form>
);

export const AllFieldsTemplate: Story<FormProps<unknown>> = (args) => (
    <Form {...args}>
        <Form.Input name="name" placeholder="Name" />
        <Form.TextArea name="comment" placeholder="Comment" />
        <Form.Timestamp
            name="time"
            rules={{
                required: 'Field is required',
                validate: futureDate(),
            }}
        />
        <Form.Checkbox
            name="terms"
            rules={{ required: 'You must agree to the terms' }}
        >
            Agree to terms
        </Form.Checkbox>
        <Form.Switch name="setting">Enable setting</Form.Switch>
        <Form.Submit>Submit</Form.Submit>
    </Form>
);
