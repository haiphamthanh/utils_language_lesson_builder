const examples = {
  2: {
    title: 'My Daily Tasks',
    content:
      'I start work at nine o’clock. First, I check my messages and review my tasks. Then I choose one small task to finish. I write code, test my changes, and ask for feedback. In the afternoon, I join a short team meeting. Before I stop, I write down what I will do tomorrow.',
    summary:
      'The developer describes a simple workday from checking tasks to planning tomorrow.',
    review: {
      vocabulary: [
        {
          text: 'feedback',
          meaning: 'phản hồi, góp ý',
          example: 'I ask for feedback.',
        },
        {
          text: 'change',
          meaning: 'thay đổi',
          example: 'I test my changes.',
        },
      ],
      phrases: [
        { text: 'write down', meaning: 'ghi lại' },
      ],
      grammar: [
        { pattern: 'Before + clause', example: 'Before I stop, I write down my plan.' },
      ],
    },
  },
  3: {
    title: 'A Small Feature',
    content:
      'Last week, I worked on a small feature. Users needed a clearer button on the home page. I changed the button text and added a helpful message. Then I tested the page on my computer. A teammate reviewed my code and suggested one improvement. We released the feature, and the page became easier to use.',
    summary:
      'The developer explains how a small interface improvement was built, reviewed, and released.',
    review: {
      vocabulary: [
        {
          text: 'feature',
          meaning: 'tính năng',
          example: 'I worked on a small feature.',
        },
        {
          text: 'release',
          meaning: 'phát hành',
          example: 'We released the feature.',
        },
      ],
      phrases: [
        { text: 'easier to use', meaning: 'dễ sử dụng hơn' },
      ],
      grammar: [
        { pattern: 'needed + noun', example: 'Users needed a clearer button.' },
      ],
    },
  },
};

export class SampleLessonGenerator {
  async generate(context) {
    const example = examples[context.sequence_number];

    if (!example) {
      throw new Error(`No sample lesson exists for step ${context.sequence_number}.`);
    }

    return { ...example, promptVersion: 'sample-v1' };
  }
}
