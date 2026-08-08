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

const regeneratedExamples = {
  1: {
    title: 'A New Developer on the Team',
    content:
      'I am a new developer in a small company. My team builds tools for local shops. I usually read a task before I start coding. When something is not clear, I ask a teammate for help. I test every small change on my computer. This routine helps me learn and work with confidence.',
    summary:
      'A new developer introduces their team, careful workflow, and learning routine.',
    review: {
      vocabulary: [
        { text: 'local shop', meaning: 'cửa hàng địa phương', example: 'We build tools for local shops.' },
        { text: 'confidence', meaning: 'sự tự tin', example: 'I work with confidence.' },
      ],
      phrases: [{ text: 'ask for help', meaning: 'nhờ giúp đỡ' }],
      grammar: [{ pattern: 'before + clause', example: 'I read a task before I start coding.' }],
    },
  },
  2: {
    title: 'A Simple Work Routine',
    content:
      'My workday begins with a short plan. I read new messages and choose an important task. After that, I make one small change in the code. I check the result and share it with a teammate. We talk about anything that could be clearer. At the end of the day, I prepare the first task for tomorrow.',
    summary:
      'The developer explains a focused routine built around planning, coding, feedback, and preparation.',
    review: {
      vocabulary: [
        { text: 'result', meaning: 'kết quả', example: 'I check the result.' },
        { text: 'important', meaning: 'quan trọng', example: 'I choose an important task.' },
      ],
      phrases: [{ text: 'at the end of', meaning: 'vào cuối' }],
      grammar: [{ pattern: 'could be + adjective', example: 'We discuss anything that could be clearer.' }],
    },
  },
  3: {
    title: 'Improving a Search Button',
    content:
      'Our website had a search button that was hard to see. I gave it a stronger color and moved it near the search box. Next, I asked two teammates to try the page. They found the button quickly, but one label was confusing. I fixed the label and tested the page again. The small update made searching simpler for everyone.',
    summary:
      'The developer improves a search button through a small design change and teammate feedback.',
    review: {
      vocabulary: [
        { text: 'confusing', meaning: 'gây khó hiểu', example: 'One label was confusing.' },
        { text: 'update', meaning: 'bản cập nhật', example: 'The small update made searching simpler.' },
      ],
      phrases: [{ text: 'hard to see', meaning: 'khó nhìn thấy' }],
      grammar: [{ pattern: 'make + noun + adjective', example: 'The update made searching simpler.' }],
    },
  },
};

export class SampleLessonGenerator {
  async generate(context) {
    const source =
      context.request_type === 'regenerate' ? regeneratedExamples : examples;
    const example = source[context.sequence_number];

    if (!example) {
      throw new Error(`No sample lesson exists for step ${context.sequence_number}.`);
    }

    return { ...example, promptVersion: 'sample-v1' };
  }
}
