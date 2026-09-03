export class SampleJourneyGenerator {
  promptVersion = 'sample-journey-v2';

  async generate(context) {
    const topicName = context.topic?.name ?? 'My Learning Topic';
    const topicDescription = context.topic?.description ?? '';

    const steps = [
      {
        title: `Introducing ${topicName}`,
        objective: `Introduce "${topicName}" in two or three short sentences.`,
        continuation_hint: 'Now describe the basic ideas.',
      },
      {
        title: 'The Basics',
        objective: `Describe the basic ideas behind ${topicName}.`,
        continuation_hint: 'Now share a personal example.',
      },
      {
        title: 'A Personal Example',
        objective: `Share one concrete example of ${topicName} from your work or life.`,
        continuation_hint: 'Now describe a challenge.',
      },
      {
        title: 'A Challenge',
        objective: `Describe one challenge you meet when working with ${topicName}.`,
        continuation_hint: 'Now summarize what you learned.',
      },
      {
        title: 'What I Learned',
        objective: `Summarize what you have learned about ${topicName} so far.`,
        continuation_hint: 'Close the journey.',
      },
    ];

    return {
      title: `${topicName} Writing Journey`,
      description: `Một hành trình luyện viết mở ra những góc nhìn gần gũi về ${topicName}, được bồi đắp qua từng trang ngắn.`,
      steps,
      promptVersion: this.promptVersion,
      generationMetadata: {
        provider: 'sample',
        topicDescription,
      },
    };
  }
}
