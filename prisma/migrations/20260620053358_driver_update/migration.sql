/*
  Warnings:

  - You are about to drop the column `latitude` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Driver` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Driver_phone_key";

-- AlterTable
ALTER TABLE "Driver" DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "Adress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "email" TEXT;
