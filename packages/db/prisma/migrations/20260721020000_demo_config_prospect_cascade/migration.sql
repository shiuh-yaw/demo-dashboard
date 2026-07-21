-- Deleting a Prospect deletes every demo config built for it (prospect-first ownership).
ALTER TABLE "DemoConfig" DROP CONSTRAINT "DemoConfig_prospectId_fkey";
ALTER TABLE "DemoConfig" ADD CONSTRAINT "DemoConfig_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
