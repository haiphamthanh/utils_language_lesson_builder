function reviewItem(text, meaning, examples) {
  return { text, meaning, examples };
}

function grammarItem(pattern, meaning, examples) {
  return { pattern, meaning, examples };
}

const examples = {
  2: {
    title: 'My Daily Tasks',
    content:
      'I start work at nine o’clock. First, I check my messages and review my tasks. Then I choose one small task to finish. I write code, test my changes, and ask for feedback. In the afternoon, I join a short team meeting. Before I stop, I write down what I will do tomorrow.',
    summary:
      'The developer describes a simple workday from checking tasks to planning tomorrow.',
    review: {
      vocabulary: [
        reviewItem('feedback', 'phản hồi, góp ý', [
          'I ask my teammate for feedback.',
          'Her feedback helped me improve the page.',
          'We share feedback after the meeting.',
          'Good feedback is clear and specific.',
          'I read the feedback before changing my code.',
        ]),
        reviewItem('change', 'thay đổi', [
          'I made a small change to the button.',
          'Please test the change on your computer.',
          'This change makes the page clearer.',
          'My teammate reviewed every change.',
          'We released the change this afternoon.',
        ]),
      ],
      phrases: [
        reviewItem('write down', 'ghi lại', [
          'I write down my tasks every morning.',
          'Please write down the error message.',
          'She wrote down three useful ideas.',
          'We write down questions before the meeting.',
          'He writes down his plan for tomorrow.',
        ]),
      ],
      grammar: [
        grammarItem('Before + clause', 'trước khi một hành động xảy ra', [
          'Before I start coding, I read the task.',
          'Before we release the feature, we test it.',
          'Before she asks for help, she checks the logs.',
          'Before the meeting begins, I prepare my notes.',
          'Before I stop working, I plan tomorrow’s task.',
        ]),
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
        reviewItem('feature', 'tính năng', [
          'I worked on a new search feature.',
          'This feature helps users find their orders.',
          'We tested the feature on mobile devices.',
          'The team released the feature on Friday.',
          'Users asked for a simpler feature.',
        ]),
        reviewItem('release', 'phát hành', [
          'We plan to release the update tomorrow.',
          'The team released a small fix.',
          'I tested the page before the release.',
          'Our next release includes two features.',
          'They release improvements every week.',
        ]),
      ],
      phrases: [
        reviewItem('easier to use', 'dễ sử dụng hơn', [
          'The new menu is easier to use.',
          'Clear labels make the form easier to use.',
          'This keyboard shortcut is easier to use.',
          'The mobile page became easier to use.',
          'We want every feature to be easier to use.',
        ]),
      ],
      grammar: [
        grammarItem('make + noun + adjective', 'làm cho một vật trở nên như thế nào', [
          'The new color makes the button clearer.',
          'Short labels make the form simpler.',
          'This change makes the page faster.',
          'Good feedback makes my code better.',
          'A clear plan makes the task easier.',
        ]),
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
        reviewItem('local shop', 'cửa hàng địa phương', [
          'Our team builds software for a local shop.',
          'The local shop sells fresh bread.',
          'I helped a local shop create a website.',
          'Many local shops need simple tools.',
          'She works with a local shop near her home.',
        ]),
        reviewItem('confidence', 'sự tự tin', [
          'Practice gives me more confidence.',
          'I explained my idea with confidence.',
          'Good preparation builds confidence.',
          'Her confidence grew after the project.',
          'I can ask questions with confidence.',
        ]),
      ],
      phrases: [
        reviewItem('ask for help', 'nhờ giúp đỡ', [
          'I ask for help when a task is unclear.',
          'Do not be afraid to ask for help.',
          'She asked for help with the test.',
          'We can ask for help in the team chat.',
          'He asks for help before making a risky change.',
        ]),
      ],
      grammar: [
        grammarItem('before + clause', 'trước khi một hành động xảy ra', [
          'I read the task before I write code.',
          'We test the feature before we release it.',
          'She checks the design before she starts.',
          'Before I ask a question, I read the notes.',
          'Before they leave, they update the plan.',
        ]),
      ],
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
        reviewItem('result', 'kết quả', [
          'I checked the result after the test.',
          'The result was better than yesterday.',
          'Please share the result with the team.',
          'This small change produced a clear result.',
          'We compare the result with our plan.',
        ]),
        reviewItem('important', 'quan trọng', [
          'I choose one important task each morning.',
          'Clear communication is important for our team.',
          'This bug affects an important feature.',
          'It is important to test every change.',
          'She wrote down the most important question.',
        ]),
      ],
      phrases: [
        reviewItem('at the end of', 'vào cuối', [
          'I update my notes at the end of the day.',
          'We review the result at the end of the meeting.',
          'The button appears at the end of the page.',
          'She asks questions at the end of the lesson.',
          'The team celebrates at the end of the project.',
        ]),
      ],
      grammar: [
        grammarItem('could be + adjective', 'có thể trở nên hoặc có trạng thái nào đó', [
          'The error message could be clearer.',
          'This function could be shorter.',
          'The page could be faster on mobile.',
          'Our daily plan could be simpler.',
          'The button color could be brighter.',
        ]),
      ],
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
        reviewItem('confusing', 'gây khó hiểu', [
          'The old button label was confusing.',
          'This error message is confusing for new users.',
          'A long menu can be confusing.',
          'The instructions became less confusing.',
          'We changed the confusing part of the form.',
        ]),
        reviewItem('update', 'bản cập nhật', [
          'The update fixed the search button.',
          'We released a small update yesterday.',
          'This update makes the page faster.',
          'I tested the update on my phone.',
          'Users liked the latest update.',
        ]),
      ],
      phrases: [
        reviewItem('hard to see', 'khó nhìn thấy', [
          'The gray icon is hard to see.',
          'Small text can be hard to see on a phone.',
          'The button was hard to see at night.',
          'This error is hard to see in the logs.',
          'Light colors are hard to see on this background.',
        ]),
      ],
      grammar: [
        grammarItem('make + noun + adjective', 'làm cho một vật trở nên như thế nào', [
          'The update made searching simpler.',
          'A stronger color made the button clearer.',
          'Short labels make the form easier.',
          'The fix made our users happier.',
          'Good spacing makes the page cleaner.',
        ]),
      ],
    },
  },
};

export class SampleLessonGenerator {
  promptVersion = 'sample-v2';

  async generate(context) {
    const source =
      context.requestType === 'regenerate' ? regeneratedExamples : examples;
    const example =
      source[context.sequenceNumber] ??
      (context.requestType === 'next_lesson' && context.sequenceNumber === 1
        ? regeneratedExamples[1]
        : null);

    if (!example) {
      throw new Error(`No sample lesson exists for step ${context.sequenceNumber}.`);
    }

    return {
      ...example,
      promptVersion: this.promptVersion,
      generationMetadata: { provider: 'sample' },
    };
  }
}
