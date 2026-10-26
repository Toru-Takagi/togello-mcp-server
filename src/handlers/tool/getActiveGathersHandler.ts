import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

type GatherResponse = {
  gatherUUID: string
  title: string
  mode: 'ADJUSTMENT' | 'CONFIRM' | 'RECRUITMENT'
  adjustmentStartDateTime: string | null
  adjustmentEndDateTime: string | null
  confirmedStartDateTime: string | null
  confirmedEndDateTime: string | null
  numberOfParticipants: number
  minNumberOfParticipants: number
  relationshipType: 'CREATOR' | 'VIEWER'
}

export const getActiveGathersHandler = async () => {
  const now = Date.now()
  try {
    const gathers = await httpClient.fetchURL<GatherResponse[]>({
      path: '/v2/gathers',
    })
    return jsonToolResponse({
      gathers: gathers
        .filter((gather) => {
          const date = gather.confirmedStartDateTime == null
            ? gather.adjustmentEndDateTime
            : gather.confirmedStartDateTime
          return typeof date === 'string' && Date.parse(date) >= now
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
    })
  } catch {
    return errorToolResponse('Error retrieving active gathers')
  }
}
