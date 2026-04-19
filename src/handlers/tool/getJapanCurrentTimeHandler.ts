import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export const getJapanCurrentTimeHandler = async () => {
  try {
    const now = new Date()
    const jstTime = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    return jsonToolResponse({
      timeZone: 'Asia/Tokyo',
      currentTime: jstTime,
    })
  } catch (error) {
    return errorToolResponse(`日本時刻取得中にエラーが発生しました: ${error}`)
  }
}
