export function generatedLessonFixture(overrides = {}) {
  const examples = ['Example 1.', 'Example 2.', 'Example 3.', 'Example 4.', 'Example 5.'];

  return {
    title: 'Generated lesson',
    content: 'A complete generated lesson for testing.',
    summary: 'A short test summary.',
    review: {
      vocabulary: [
        { text: 'task', meaning: 'nhiệm vụ', examples },
        { text: 'result', meaning: 'kết quả', examples },
      ],
      phrases: [{ text: 'write down', meaning: 'ghi lại', examples }],
      grammar: [
        {
          pattern: 'enjoy + V-ing',
          meaning: 'thích làm việc gì',
          examples,
        },
      ],
    },
    promptVersion: 'test-v1',
    ...overrides,
  };
}
