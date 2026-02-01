import { Model } from '@nozbe/watermelondb';
import { field, text, date, relation, children, readonly } from '@nozbe/watermelondb/decorators';

export default class Disease extends Model {
  static table = 'diseases';

  static associations = {
    crops: { type: 'belongs_to' as const, key: 'crop_id' },
    treatments: { type: 'has_many' as const, foreignKey: 'disease_id' },
  };

  @text('crop_id') cropId!: string;
  @text('name') name!: string;
  @text('scientific_name') scientificName?: string;
  @text('description') description!: string;
  @text('symptoms') symptoms!: string;
  @text('causes') causes?: string;
  @text('prevention') prevention?: string;
  @text('severity') severity!: string;
  @text('image_uri') imageUri?: string;
  @field('model_class_id') modelClassId!: number;
  @field('is_healthy') isHealthy!: boolean;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @relation('crops', 'crop_id') crop: any;
  @children('treatments') treatments: any;

  get symptomsArray(): string[] {
    try {
      return JSON.parse(this.symptoms);
    } catch {
      return [this.symptoms];
    }
  }
}
