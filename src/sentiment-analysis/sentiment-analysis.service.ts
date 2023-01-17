import { Injectable } from '@nestjs/common'
import { drive } from '@googleapis/drive'

@Injectable()
export class SentimentAnalysisService {
  constructor() {
    this.loadTrainingDataset().then(data => console.log(data))
  }

  async loadTrainingDataset() {
    try {
      const file = await drive('v3').files.get({
        fileId: 'https://drive.google.com/file/d/1UkpTCiNVULMRbBpvJzU2-bDpgAJkWTRO',
        alt: 'media',
      })
      console.log(file.status)
      return file.status
    } catch (err) {
      // TODO(developer) - Handle error
      console.log(err)
      throw err
    }
  }
}
