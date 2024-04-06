// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from 'wallet/context';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import {
    ThemedCopySolid,
    ThemedTrashcanOutlined,
    ThemedEditOutlined,
    ThemedContactSendOutlined,
} from 'components/Common/CustomIcons';
import Modal from 'components/Common/Modal';
import { ModalInput, InputFlex } from 'components/Common/Inputs';
import { toast } from 'react-toastify';
import PrimaryButton, {
    SecondaryButton,
} from 'components/Common/PrimaryButton';
import { getContactAddressError, getContactNameError } from 'validation';
import {
    ContactList,
    ContactsPanel,
    Row,
    ContactListAddress,
    ContactListName,
    ButtonPanel,
} from 'components/Contacts/styles';

const Contacts = () => {
    const ContextValue = React.useContext(WalletContext);
    const { cashtabState, updateCashtabState } = ContextValue;
    const { wallets, contactList } = cashtabState;

    const wallet = wallets.length > 0 ? wallets[0] : false;

    const emptyFormData = {
        renamedContactName: '',
        contactToBeDeletedName: '',
        newContactName: '',
        newContactAddress: '',
    };
    const emptyFormDataErrors = {
        renamedContactName: false,
        contactToBeDeletedName: false,
        newContactName: false,
        newContactAddress: false,
    };
    // State variables
    const [formData, setFormData] = useState(emptyFormData);
    const [formDataErrors, setFormDataErrors] = useState(emptyFormDataErrors);
    const [contactToBeRenamed, setContactToBeRenamed] = useState(null);
    const [contactToBeDeleted, setContactToBeDeleted] = useState(null);
    const [showAddNewContactModal, setShowAddNewContactModal] = useState(false);

    /**
     * Update formData with user input
     * @param {Event} e js input event
     * e.target.value will be input value
     * e.target.name will be name of originating input field
     */
    const handleInput = e => {
        const { name, value } = e.target;

        if (name === 'renamedContactName' || name === 'newContactName') {
            const contactNameError = getContactNameError(value, contactList);
            setFormDataErrors(previous => ({
                ...previous,
                [name]: contactNameError,
            }));
        }
        if (name === 'contactToBeDeletedName') {
            const deleteConfirmationError =
                value === 'delete ' + contactToBeDeleted.name
                    ? false
                    : `Input must exactly match "delete ${contactToBeDeleted.name}"`;
            setFormDataErrors(previous => ({
                ...previous,
                [name]: deleteConfirmationError,
            }));
        }
        if (name === 'newContactAddress') {
            const newContactAddressError = getContactAddressError(
                value,
                contactList,
            );
            setFormDataErrors(previous => ({
                ...previous,
                [name]: newContactAddressError,
            }));
        }
        setFormData(previous => ({
            ...previous,
            [name]: value,
        }));
    };

    const renameContact = async () => {
        // Find the contact you want to rename
        let contactToUpdate = contactList.find(
            contact => contact.address === contactToBeRenamed.address,
        );
        const oldName = contactToUpdate.name;

        // if a match was found
        if (typeof contactToUpdate !== 'undefined') {
            // update the contact name
            contactToUpdate.name = formData.renamedContactName;

            // Update localforage and state
            await updateCashtabState('contactList', contactList);
            toast.success(
                `"${oldName}" renamed to "${formData.renamedContactName}"`,
            );
        } else {
            toast.error(`Unable to find contact`);
        }
        // Clear contactToBeRenamed field to hide the modal
        setContactToBeRenamed(null);

        // Clear contact rename input
        setFormData(previous => ({
            ...previous,
            renamedContactName: '',
        }));
    };

    const deleteContact = async () => {
        // filter contact from local contact list array
        const updatedContactList = contactList.filter(
            contact => contact.address !== contactToBeDeleted.address,
        );

        // Update localforage and state
        await updateCashtabState('contactList', updatedContactList);
        toast.success(`"${contactToBeDeleted.name}" removed from Contacts`);

        // Reset contactToBeDeleted to hide the modal
        setContactToBeDeleted(null);

        // Clear contact to delete input
        setFormData(previous => ({
            ...previous,
            contactToBeDeletedName: '',
        }));
    };

    const addNewContact = async () => {
        // Check to see if the contact exists
        // Note: we validate for this before entering the function, should never happen
        const contactExists = contactList.find(
            contact => contact.address === formData.newContactAddress,
        );

        if (typeof contactExists !== 'undefined') {
            // Contact exists
            toast.error(
                `${formData.newContactAddress} already exists in Contacts`,
            );
        } else {
            contactList.push({
                name: formData.newContactName,
                address: formData.newContactAddress,
            });
            // update localforage and state
            await updateCashtabState('contactList', contactList);
            toast.success(
                `"${formData.newContactName}" (${formData.newContactAddress}) added to Contacts`,
            );
        }

        // Reset relevant state fields
        setShowAddNewContactModal(false);

        // Clear new contact formData
        setFormData(previous => ({
            ...previous,
            newContactAddress: '',
            newContactName: '',
        }));
    };

    const exportContactList = contactListArray => {
        if (!contactListArray) {
            toast.error('Unable to export contact list');
            return;
        }

        // convert object array into csv data
        let csvContent =
            'data:text/csv;charset=utf-8,' +
            contactListArray.map(
                element => '\n' + element.name + '|' + element.address,
            );

        // encode csv
        var encodedUri = encodeURI(csvContent);

        // hidden DOM node to set the default file name
        var csvLink = document.createElement('a');
        csvLink.setAttribute('href', encodedUri);
        csvLink.setAttribute(
            'download',
            'Cashtab_Contacts_' + wallet.name + '.csv',
        );
        document.body.appendChild(csvLink);
        csvLink.click();
    };

    return (
        <>
            {contactToBeRenamed !== null && (
                <Modal
                    height={180}
                    title={`Rename "${contactToBeRenamed.name}"?`}
                    handleOk={renameContact}
                    handleCancel={() => setContactToBeRenamed(null)}
                    showCancelButton
                    disabled={
                        formDataErrors.renamedContactName !== false ||
                        formData.renamedContactName === ''
                    }
                >
                    <ModalInput
                        placeholder="Enter new contact name"
                        name="renamedContactName"
                        value={formData.renamedContactName}
                        error={formDataErrors.renamedContactName}
                        handleInput={handleInput}
                    />
                </Modal>
            )}
            {contactToBeDeleted !== null && (
                <Modal
                    height={210}
                    title={`Delete ${contactToBeDeleted.name}?`}
                    handleOk={deleteContact}
                    handleCancel={() => setContactToBeDeleted(null)}
                    showCancelButton
                    disabled={
                        formDataErrors.contactToBeDeletedName !== false ||
                        formData.contactToBeDeletedName === ''
                    }
                >
                    <ModalInput
                        placeholder={`Type "delete ${contactToBeDeleted.name}" to confirm`}
                        name="contactToBeDeletedName"
                        value={formData.contactToBeDeletedName}
                        handleInput={handleInput}
                        error={formDataErrors.contactToBeDeletedName}
                    />
                </Modal>
            )}
            {showAddNewContactModal && (
                <Modal
                    height={250}
                    title={`Add new contact`}
                    handleOk={addNewContact}
                    handleCancel={() => setShowAddNewContactModal(false)}
                    showCancelButton
                    disabled={
                        formDataErrors.newContactName !== false ||
                        formDataErrors.newContactAddress !== false ||
                        formData.newContactName === '' ||
                        formData.newContactAddress === ''
                    }
                >
                    <InputFlex>
                        <ModalInput
                            placeholder="Enter contact name"
                            name="newContactName"
                            value={formData.newContactName}
                            error={formDataErrors.newContactName}
                            handleInput={handleInput}
                        />
                        <ModalInput
                            placeholder="Enter new eCash address"
                            name="newContactAddress"
                            value={formData.newContactAddress}
                            error={formDataErrors.newContactAddress}
                            handleInput={handleInput}
                        />
                    </InputFlex>
                </Modal>
            )}
            <ContactList data-testid="contacts">
                <ContactsPanel>
                    {contactList && contactList.length > 0 ? (
                        contactList.map((contact, index) => (
                            <Row key={index}>
                                <ContactListName>
                                    {contact.name}
                                </ContactListName>
                                <ContactListAddress className="notranslate">
                                    {contact.address.endsWith('.xec')
                                        ? contact.address
                                        : `${contact.address.slice(
                                              6,
                                              9,
                                          )}...${contact.address.slice(-3)}`}
                                </ContactListAddress>
                                <ButtonPanel>
                                    <CopyToClipboard
                                        data={contact.address}
                                        showToast
                                    >
                                        <ThemedCopySolid />
                                    </CopyToClipboard>
                                    <ThemedEditOutlined
                                        data-testid="rename-contact-btn"
                                        onClick={() =>
                                            setContactToBeRenamed(contact)
                                        }
                                    />
                                    <Link
                                        data-testid="send-to-contact"
                                        to="/send"
                                        state={{
                                            contactSend: contact.address,
                                        }}
                                    >
                                        <ThemedContactSendOutlined />
                                    </Link>
                                    <ThemedTrashcanOutlined
                                        data-testid="delete-contact-btn"
                                        onClick={() =>
                                            setContactToBeDeleted(contact)
                                        }
                                    />
                                </ButtonPanel>
                            </Row>
                        ))
                    ) : (
                        <div>
                            <p>{'Your contact list is empty.'}</p>
                            <p>
                                {
                                    'Contacts can be added by clicking on a received transaction and looking for the "Add to contacts" icon or via the "New Contact" button below.'
                                }
                            </p>
                        </div>
                    )}
                </ContactsPanel>
                <Row>
                    <PrimaryButton
                        data-testid="add-contact-btn"
                        onClick={() => setShowAddNewContactModal(true)}
                    >
                        Add Contact
                    </PrimaryButton>
                </Row>
                {contactList && contactList.length > 0 && (
                    <Row>
                        <SecondaryButton
                            onClick={() => exportContactList(contactList)}
                        >
                            Export
                        </SecondaryButton>
                    </Row>
                )}
            </ContactList>
        </>
    );
};

export default Contacts;
