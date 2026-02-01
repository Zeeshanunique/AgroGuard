import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class ScanHistory extends Model {
  static table = 'scan_history';

  @text('image_uri') imageUri!: string;
  @text('crop_id') cropId?: string;
  @text('disease_id') diseaseId?: string;
  @text('crop_name') cropName?: string;
  @text('disease_name') diseaseName?: string;
  @field('crop_confidence') cropConfidence!: number;
  @field('disease_confidence') diseaseConfidence!: number;
  @field('is_healthy') isHealthy!: boolean;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;
  @text('notes') notes?: string;
  @readonly @date('scanned_at') scannedAt!: Date;
}
