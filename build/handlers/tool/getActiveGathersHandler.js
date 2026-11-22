import { HttpStatusError, httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const getActiveGathersHandler = async () => {
    const now = Date.now();
    try {
        const gathers = await httpClient.fetchURL({
            path: '/v2/integration/gathers',
        });
        return jsonToolResponse({
            gathers: gathers
                .filter((gather) => {
                const date = gather.confirmedStartDateTime == null
                    ? gather.adjustmentEndDateTime
                    : gather.confirmedStartDateTime;
                return typeof date === 'string' && Date.parse(date) >= now;
            })
                .map((gather) => ({
                gatherUUID: gather.gatherUUID,
                title: gather.title,
                mode: gather.mode,
                adjustmentStartDateTime: gather.adjustmentStartDateTime,
                adjustmentEndDateTime: gather.adjustmentEndDateTime,
                confirmedStartDateTime: gather.confirmedStartDateTime,
                confirmedEndDateTime: gather.confirmedEndDateTime,
                numberOfParticipants: gather.numberOfParticipants,
                minNumberOfParticipants: gather.minNumberOfParticipants,
                relationshipType: gather.relationshipType,
            })),
        });
    }
    catch (error) {
        if (error instanceof HttpStatusError) {
            if (error.status === 401) {
                return errorToolResponse('A valid Togello OAuth access token with gathers:read is required. Reconnect or reauthorize with Togello OAuth.');
            }
            if (error.status === 403) {
                return errorToolResponse('The gathers:read scope is required. Reauthorize the Togello OAuth connection and grant gathers:read.');
            }
        }
        return errorToolResponse('Error retrieving active gathers');
    }
};
