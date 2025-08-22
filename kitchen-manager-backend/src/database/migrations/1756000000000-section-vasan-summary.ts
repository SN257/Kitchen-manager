import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class SectionVasanSummary1756000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'section_vasan_summary',
        columns: [
          { name: 'id', type: 'serial', isPrimary: true },
          { name: 'eventId', type: 'int', isNullable: false },
          { name: 'userId', type: 'int', isNullable: false },
          { name: 'rows', type: 'jsonb', isNullable: false },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('section_vasan_summary');
  }
}
