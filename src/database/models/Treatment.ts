import { Model } from '@nozbe/watermelondb';
import { text, date, relation, readonly } from '@nozbe/watermelondb/decorators';

export default class Treatment extends Model {
  static table = 'treatments';

  static associations = {
    diseases: { type: 'belongs_to' as const, key: 'disease_id' },
  };

  @text('disease_id') diseaseId!: string;
  @text('type') type!: 'organic' | 'chemical';
  @text('name') name!: string;
  @text('description') description!: string;
  @text('application_method') applicationMethod!: string;
  @text('dosage') dosage!: string;
  @text('frequency') frequency?: string;
  @text('precautions') precautions!: string;
  @text('effectiveness') effectiveness!: string;
  @text('cost_level') costLevel?: string;
  @text('availability') availability?: string;
  @text('environmental_impact') environmentalImpact?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('diseases', 'disease_id') disease: any;

  get precautionsArray(): string[] {
    try {
      return JSON.parse(this.precautions);
    } catch {
      return [this.precautions];
    }
  }
}
