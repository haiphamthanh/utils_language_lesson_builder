const DAY_IN_MILLISECONDS = 86_400_000;

function dayNumber(isoDate) {
  return Date.parse(`${isoDate}T00:00:00Z`) / DAY_IN_MILLISECONDS;
}

export function calculateStreaks(studyDates, currentDate) {
  const days = [...new Set(studyDates)].map(dayNumber).sort((a, b) => b - a);

  if (days.length === 0 || !currentDate) {
    return { current: 0, longest: 0 };
  }

  let longest = 1;
  let running = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (days[index - 1] - days[index] === 1) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  const today = dayNumber(currentDate);
  if (days[0] !== today && days[0] !== today - 1) {
    return { current: 0, longest };
  }

  let current = 1;
  for (let index = 1; index < days.length; index += 1) {
    if (days[index - 1] - days[index] !== 1) break;
    current += 1;
  }

  return { current, longest };
}

export class StatsService {
  constructor(statsRepository) {
    this.statsRepository = statsRepository;
  }

  async getOverview(userId) {
    const [completions, activity, vocabulary] = await Promise.all([
      this.statsRepository.getCompletionCounts(userId),
      this.statsRepository.getStudyActivity(userId),
      this.statsRepository.getVocabularyCounts(userId),
    ]);
    const streaks = calculateStreaks(
      activity.study_dates,
      activity.current_date,
    );

    return {
      lessons: {
        completed: completions.completed_lessons,
        reviewCompletions: completions.review_completions,
        totalCompletions: completions.total_completions,
      },
      studyDays: {
        total: activity.total_study_days,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        last7Days: activity.days_in_last_7,
        last30Days: activity.days_in_last_30,
      },
      vocabulary: {
        encountered: vocabulary.encountered_items,
        repeated: vocabulary.repeated_items,
      },
    };
  }
}
