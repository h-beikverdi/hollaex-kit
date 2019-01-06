import React from 'react';

import { getCountry } from './utils';
import { Button, PanelInformationRow } from '../../components';
import STRINGS from '../../config/localizedStrings';

const MobileVerificationHome = ({ user, setActivePageContent, setActiveTab }) => {
    const { phone_number, address } = user;
    if (!phone_number) {
        return (
            <div>
                <Button label={STRINGS.USER_VERIFICATION.START_PHONE_VERIFICATION} onClick={() => setActivePageContent(3)} />
            </div>
        );
    } else {
        return <div className="my-3">
            <PanelInformationRow
                label={STRINGS.USER_VERIFICATION.PHONE_COUNTRY_ORIGIN}
                information={getCountry(address.country).name}
                className="title-font"
                disable />
            <PanelInformationRow
                label={STRINGS.USER_VERIFICATION.MOBILE_NUMBER}
                information={phone_number}
                className="title-font"
                disable />
        </div>
    }
};

export default MobileVerificationHome;