import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinalNosSummaryUnique1756250000000 implements MigrationInterface {
  name = 'FinalNosSummaryUnique1756250000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicates keeping the latest per (eventId,userId)
    await queryRunner.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY "eventId", "userId" ORDER BY "updatedAt" DESC, id DESC) AS rn
        FROM "final_nos_summary"
      )
      DELETE FROM "final_nos_summary" f
      USING ranked r
      WHERE f.id = r.id AND r.rn > 1;
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "UQ_final_nos_summary_event_user" ON "final_nos_summary" ("eventId", "userId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_final_nos_summary_event_user"');
  }
}
