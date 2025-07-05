import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1751300220870 implements MigrationInterface {
  name = 'Migration1751300220870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "recipes" ("id" SERIAL NOT NULL, "vangiName" character varying NOT NULL, "ingredients" jsonb NOT NULL, "items_per_kg" integer NOT NULL, "center" character varying, "userId" integer, CONSTRAINT "PK_8f09680a51bf3669c1598a21682" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying NOT NULL, "role" character varying, "center" character varying NOT NULL, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "ingredients" ("id" SERIAL NOT NULL, "ingredientName" character varying NOT NULL, "category" character varying NOT NULL, "pricePerKg" integer NOT NULL, CONSTRAINT "PK_9240185c8a5507251c9f15e0649" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "food_item" ("id" SERIAL NOT NULL, "vangiName" character varying NOT NULL, "category" character varying NOT NULL, CONSTRAINT "PK_057940b0225785ec693de562cf4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "recipes" ADD CONSTRAINT "FK_ad4f881e4b9769d16c0ed2bb3f0" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "annkut_sidhu_saman" ("id" SERIAL NOT NULL, "mithai_id" integer NOT NULL, "mithai_name" character varying NOT NULL, "total_nang" integer NOT NULL, "total_flour" double precision NOT NULL, CONSTRAINT "PK_d6cf959b2e98dfc4405d7ce31a0" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recipes" DROP CONSTRAINT "FK_ad4f881e4b9769d16c0ed2bb3f0"`,
    );
    await queryRunner.query(`DROP TABLE "food_item"`);
    await queryRunner.query(`DROP TABLE "ingredients"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "recipes"`);
    await queryRunner.query(`DROP TABLE "annkut_sidhu_saman"`);
  }
}
