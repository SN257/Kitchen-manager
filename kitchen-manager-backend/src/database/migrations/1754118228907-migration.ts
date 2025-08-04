import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1754118228907 implements MigrationInterface {
    name = 'Migration1754118228907'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD "userId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP CONSTRAINT "FK_80b6c934e773dfa013d2af15a25"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP COLUMN "total_nang"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD "total_nang" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP COLUMN "total_flour"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD "total_flour" double precision NOT NULL`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ALTER COLUMN "eventId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD CONSTRAINT "FK_80b6c934e773dfa013d2af15a25" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP CONSTRAINT "FK_80b6c934e773dfa013d2af15a25"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ALTER COLUMN "eventId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP COLUMN "total_flour"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD "total_flour" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP COLUMN "total_nang"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD "total_nang" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD CONSTRAINT "FK_80b6c934e773dfa013d2af15a25" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "annkut_sidhu_saman" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
