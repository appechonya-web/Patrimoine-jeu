-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_collateralPropertyId_fkey" FOREIGN KEY ("collateralPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
