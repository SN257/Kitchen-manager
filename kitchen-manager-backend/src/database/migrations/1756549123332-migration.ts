import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1756549123332 implements MigrationInterface {
    name = 'Migration1756549123332'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vasan" DROP CONSTRAINT "FK_event_vasan"`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" DROP CONSTRAINT "FK_vasan_fill_plan_vasan"`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" DROP CONSTRAINT "FK_vasan_fill_plan_event"`);
        await queryRunner.query(`ALTER TABLE "vasan_nos_calculation_entry" DROP CONSTRAINT "FK_event_vasan_nos_calc"`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" DROP CONSTRAINT "FK_annkut_food_selection_event"`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" DROP CONSTRAINT "FK_annkut_food_selection_fooditem"`);
        await queryRunner.query(`ALTER TABLE "vasan" ADD CONSTRAINT "FK_8e10d0923ec89d0aa4283b0814c" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" ADD CONSTRAINT "FK_4c71cc80bdca8a10c72958c2686" FOREIGN KEY ("vasanId") REFERENCES "vasan"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" ADD CONSTRAINT "FK_cf7a2c7026143510bf3c911b261" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "section_vasan_summary" ADD CONSTRAINT "FK_6f53dca859b14cb6d5504bb342b" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "section_layout" ADD CONSTRAINT "FK_56d98ce321b9aefad443cc908af" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan_nos_calculation_entry" ADD CONSTRAINT "FK_d04299cb1c777942431baf74880" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" ADD CONSTRAINT "FK_a2ec8aff0254aff8d93c368dfdc" FOREIGN KEY ("foodItemId") REFERENCES "food_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" ADD CONSTRAINT "FK_0cf76b3bbbe0439d2d15243cdcb" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "final_nos_summary" ADD CONSTRAINT "FK_2c74d2bcdeeef31c19ff0394849" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "final_nos_summary" DROP CONSTRAINT "FK_2c74d2bcdeeef31c19ff0394849"`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" DROP CONSTRAINT "FK_0cf76b3bbbe0439d2d15243cdcb"`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" DROP CONSTRAINT "FK_a2ec8aff0254aff8d93c368dfdc"`);
        await queryRunner.query(`ALTER TABLE "vasan_nos_calculation_entry" DROP CONSTRAINT "FK_d04299cb1c777942431baf74880"`);
        await queryRunner.query(`ALTER TABLE "section_layout" DROP CONSTRAINT "FK_56d98ce321b9aefad443cc908af"`);
        await queryRunner.query(`ALTER TABLE "section_vasan_summary" DROP CONSTRAINT "FK_6f53dca859b14cb6d5504bb342b"`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" DROP CONSTRAINT "FK_cf7a2c7026143510bf3c911b261"`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" DROP CONSTRAINT "FK_4c71cc80bdca8a10c72958c2686"`);
        await queryRunner.query(`ALTER TABLE "vasan" DROP CONSTRAINT "FK_8e10d0923ec89d0aa4283b0814c"`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" ADD CONSTRAINT "FK_annkut_food_selection_fooditem" FOREIGN KEY ("foodItemId") REFERENCES "food_item"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "annkut_food_selection" ADD CONSTRAINT "FK_annkut_food_selection_event" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan_nos_calculation_entry" ADD CONSTRAINT "FK_event_vasan_nos_calc" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" ADD CONSTRAINT "FK_vasan_fill_plan_event" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan_fill_plan" ADD CONSTRAINT "FK_vasan_fill_plan_vasan" FOREIGN KEY ("vasanId") REFERENCES "vasan"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vasan" ADD CONSTRAINT "FK_event_vasan" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
