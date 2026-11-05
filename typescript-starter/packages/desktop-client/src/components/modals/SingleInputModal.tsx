/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// @ts-strict-ignore
import React, {useState} from 'react';
import type {ComponentPropsWithoutRef, ComponentType, FormEvent} from 'react';
import {Form} from 'react-aria-components';

import {Button} from '@actual-app/components/button';
import {FormError} from '@actual-app/components/form-error';
import {InitialFocus} from '@actual-app/components/initial-focus';
import {styles} from '@actual-app/components/styles';
import {View} from '@actual-app/components/view';

import {Modal, ModalCloseButton} from '#components/common/Modal';
import type {ModalHeader} from '#components/common/Modal';
import {InputField} from '#components/mobile/MobileForms';

type SingleInputModalProps = {
  name: string;
  Header: ComponentType<ComponentPropsWithoutRef<typeof ModalHeader>>;
  buttonText: string;
  onSubmit: (value: string) => void;
  onValidate?: (value: string) => string | null;
  inputPlaceholder?: string;
};

export function SingleInputModal({
  name,
  Header,
  buttonText,
  onSubmit,
  onValidate,
  inputPlaceholder,
}: SingleInputModalProps) {
  const [value, setValue] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const _onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const error = onValidate?.(value);
    if (error) {
      setErrorMessage(error);
      return;
    }

    onSubmit?.(value);
  };

  return (
    <Modal name={name}>
      {({state}) => (
        <>
          <Header rightContent={<ModalCloseButton onPress={() => state.close()} />} />
          <Form
            onSubmit={e => {
              _onSubmit(e);
              state.close();
            }}
          >
            <View>
              <InitialFocus>
                <InputField
                  placeholder={inputPlaceholder}
                  defaultValue={value}
                  onChangeValue={setValue}
                />
              </InitialFocus>
              {errorMessage && (
                <FormError
                  style={{
                    paddingTop: 5,
                    marginLeft: styles.mobileEditingPadding,
                    marginRight: styles.mobileEditingPadding,
                  }}
                >
                  * {errorMessage}
                </FormError>
              )}
            </View>
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                paddingTop: 10,
              }}
            >
              <Button
                type="submit"
                variant="primary"
                style={{
                  height: styles.mobileMinHeight,
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                }}
              >
                {buttonText}
              </Button>
            </View>
          </Form>
        </>
      )}
    </Modal>
  );
}
