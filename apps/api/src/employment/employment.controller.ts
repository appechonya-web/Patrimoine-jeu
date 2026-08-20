import { BadRequestException, Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { createJobPostingInputSchema, takeJobInputSchema } from "@patrimoine-jeu/domain";
import { CurrentPlayer } from "../auth/current-player.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { EmploymentService } from "./employment.service.js";

@Controller()
@UseGuards(JwtAuthGuard)
export class EmploymentController {
  constructor(private readonly employmentService: EmploymentService) {}

  @Get("jobs")
  listJobs(@CurrentPlayer() playerId: string) {
    return this.employmentService.listJobs(playerId);
  }

  @Get("employment/me")
  getCurrentEmployment(@CurrentPlayer() playerId: string) {
    return this.employmentService.getCurrentEmployment(playerId);
  }

  @Post("employment")
  takeJob(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const parsed = takeJobInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.employmentService.takeJob(playerId, parsed.data.jobId);
  }

  @Delete("employment")
  quitJob(@CurrentPlayer() playerId: string) {
    return this.employmentService.quitJob(playerId);
  }

  @Get("job-postings")
  listJobPostings() {
    return this.employmentService.listJobPostings();
  }

  @Post("companies/:id/job-postings")
  createJobPosting(@CurrentPlayer() playerId: string, @Param("id") companyId: string, @Body() body: unknown) {
    const parsed = createJobPostingInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.employmentService.createJobPosting(playerId, companyId, parsed.data);
  }

  @Delete("job-postings/:postingId")
  cancelJobPosting(@CurrentPlayer() playerId: string, @Param("postingId") postingId: string) {
    return this.employmentService.cancelJobPosting(playerId, postingId);
  }

  @Get("companies/:id/staff")
  listCompanyStaff(@CurrentPlayer() playerId: string, @Param("id") companyId: string) {
    return this.employmentService.listCompanyStaff(playerId, companyId);
  }

  @Post("job-postings/:postingId/apply")
  applyToJobPosting(@CurrentPlayer() playerId: string, @Param("postingId") postingId: string) {
    return this.employmentService.applyToJobPosting(playerId, postingId);
  }

  @Post("employment/:employmentId/fire")
  fireCompanyEmployee(@CurrentPlayer() playerId: string, @Param("employmentId") employmentId: string) {
    return this.employmentService.fireCompanyEmployee(playerId, employmentId);
  }
}
