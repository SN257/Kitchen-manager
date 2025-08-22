import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class FinalNosSummary1756200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'final_nos_summary',
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
    await queryRunner.dropTable('final_nos_summary');
  }
}
