import { Model } from '@nozbe/watermelondb';
import { field, text, date, children, readonly } from '@nozbe/watermelondb/decorators';

export default class Crop extends Model {
  static table = 'crops';

  static associations = {
    diseases: { type: 'has_many' as const, foreignKey: 'crop_id' },
  };

  @text('name') name!: string;
  @text('scientific_name') scientificName!: string;
  @text('description') description!: string;
  @text('category') category!: string;
  @text('image_uri') imageUri?: string;
  @field('model_class_id') modelClassId!: number;
  @text('growing_tips') growingTips?: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  @children('diseases') diseases: any;
}
