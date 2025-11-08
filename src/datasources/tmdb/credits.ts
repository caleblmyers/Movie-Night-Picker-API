/**
 * Credits and role filtering methods
 */

import { TMDBClient } from "./client";
import { PersonRoleInfo, CACHE_TTL } from "./types";

export class CreditsMethods extends TMDBClient {
  /**
   * Get combined credits (cast and crew) for a person (with caching)
   */
  async getPersonCombinedCredits(personId: number) {
    return this.getCachedOrRequest(
      "person_credits",
      this.personCreditsCache,
      personId,
      CACHE_TTL.PERSON_CREDITS,
      () =>
        this.makeRequest<{
          cast?: unknown[];
          crew?: Array<{
            job?: string;
            department?: string;
          }>;
        }>(
          `/person/${personId}/combined_credits`,
          undefined,
          "Failed to get person combined credits from TMDB"
        )
    );
  }

  /**
   * Get person role information (actor/crew) efficiently
   * Uses caching and combines both checks into a single API call
   */
  private async getPersonRoleInfo(personId: number): Promise<PersonRoleInfo> {
    const credits = await this.getPersonCombinedCredits(personId);

    const isActor = !!(credits.cast && credits.cast.length > 0);

    const isCrew = credits.crew
      ? credits.crew.some(
          (credit) =>
            credit.job === "Director" ||
            credit.department === "Directing" ||
            credit.job === "Writer" ||
            credit.department === "Writing" ||
            credit.job === "Screenplay" ||
            credit.job === "Story"
        )
      : false;

    return { isActor, isCrew };
  }

  /**
   * Check if a person has actor credits (appears in cast)
   * Uses cached role info when available
   */
  async isActor(personId: number): Promise<boolean> {
    try {
      const roleInfo = await this.getPersonRoleInfo(personId);
      return roleInfo.isActor;
    } catch {
      return false;
    }
  }

  /**
   * Check if a person has director/writer credits
   * Uses cached role info when available
   */
  async isDirectorOrWriter(personId: number): Promise<boolean> {
    try {
      const roleInfo = await this.getPersonRoleInfo(personId);
      return roleInfo.isCrew;
    } catch {
      return false;
    }
  }

  /**
   * Filter person IDs to only include actors (parallelized)
   */
  async filterToActorsOnly(personIds: number[]): Promise<number[]> {
    if (personIds.length === 0) return [];

    // Process in parallel with batching to avoid overwhelming the API
    const batchSize = 10;
    const actorIds: number[] = [];

    for (let i = 0; i < personIds.length; i += batchSize) {
      const batch = personIds.slice(i, i + batchSize);
      const roleInfos = await Promise.all(
        batch.map((id) => this.getPersonRoleInfo(id))
      );

      batch.forEach((id, index) => {
        if (roleInfos[index].isActor) {
          actorIds.push(id);
        }
      });
    }

    return actorIds;
  }

  /**
   * Filter person IDs to only include directors/writers (parallelized)
   */
  async filterToCrewOnly(personIds: number[]): Promise<number[]> {
    if (personIds.length === 0) return [];

    // Process in parallel with batching to avoid overwhelming the API
    const batchSize = 10;
    const crewIds: number[] = [];

    for (let i = 0; i < personIds.length; i += batchSize) {
      const batch = personIds.slice(i, i + batchSize);
      const roleInfos = await Promise.all(
        batch.map((id) => this.getPersonRoleInfo(id))
      );

      batch.forEach((id, index) => {
        if (roleInfos[index].isCrew) {
          crewIds.push(id);
        }
      });
    }

    return crewIds;
  }

  /**
   * Filter people by role type (actor, crew, or both)
   * Optimized to use parallel processing and single API call per person
   */
  async filterPeopleByRole(
    people: Array<{ id: number }>,
    roleType: "actor" | "crew" | "both"
  ): Promise<Array<{ id: number }>> {
    if (roleType === "both" || people.length === 0) {
      return people;
    }

    // Process in parallel with batching
    const batchSize = 10;
    const filtered: Array<{ id: number }> = [];

    for (let i = 0; i < people.length; i += batchSize) {
      const batch = people.slice(i, i + batchSize);
      const roleInfos = await Promise.all(
        batch.map((person) => this.getPersonRoleInfo(person.id))
      );

      batch.forEach((person, index) => {
        const roleInfo = roleInfos[index];
        if (
          (roleType === "actor" && roleInfo.isActor) ||
          (roleType === "crew" && roleInfo.isCrew)
        ) {
          filtered.push(person);
        }
      });
    }

    return filtered;
  }
}

