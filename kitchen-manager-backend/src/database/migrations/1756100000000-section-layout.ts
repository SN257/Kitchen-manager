import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class SectionLayout1756100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: 'section_layout',
      columns: [
        { name: 'id', type: 'serial', isPrimary: true },
        { name: 'eventId', type: 'int', isNullable: false },
        { name: 'userId', type: 'int', isNullable: false },
        { name: 'sectionId', type: 'int', isNullable: false },
        { name: 'cells', type: 'jsonb', isNullable: false },
        { name: 'createdAt', type: 'timestamp', default: 'now()' },
        { name: 'updatedAt', type: 'timestamp', default: 'now()' }
      ]
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('section_layout');
  }
}
