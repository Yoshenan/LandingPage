import { Telegraf, Scenes, session, Markup } from 'telegraf';

type RequestState = {
  answers: { [key: string]: string };
  stepIndex: number;
};

const steps = [

  {
    key: "client",
    question: "Enter Client Name:"
  },
  {
    key: "organization",
    question: "Enter Organization:"
  },
  {
    key: "fullName",
    question: "Enter FullName:"
  },
  {
    key: "email",
    question: "Enter Email:"
  },
  {
    key: "phone",
    question: "Enter your Phone Number:"
  },
  {
    key: "environment",
    question: "Select Environment",
    options: ["Production", "UAT"]
  },
  {
    key: "platformCategory",
    question: " Select Platform Category:",
    options: [
      "VM Access",
      "VPN Access",
      "Atlas MongoDB Monitoring Access",
      "Atlas MongoDB Management Access",
      "Microsoft Azure Monitoring Access",
      "Microsoft Azure Management Access",
      "Application Portal"
    ]
  },
  {
    key: "requestType",
    question: "Select Request Action:",
    options: ["New", "Re-activate", "Reset Password", "Delete or Block"]
  }

];

async function askStep(ctx: any, stepIndex: number) {

  const step = steps[stepIndex];

  // If the step has options, render Inline Keyboard buttons
  if (step.options) {

    const buttons = step.options.map((opt) => [
      Markup.button.callback(opt, `OPT_${opt}`)
    ]);

    await ctx.reply(
      step.question,
      Markup.inlineKeyboard(buttons)
    );

  } else {

    // Standard text prompt
    await ctx.reply(step.question);

  }
}

const requestWizard = new Scenes.WizardScene<Scenes.WizardContext>(
  'REQUEST_WIZARD',

  async (ctx) => {

    const state = ctx.wizard.state as RequestState;

    state.answers = {};
    state.stepIndex = 0;

    await ctx.reply(
      '📋 *Request Form*\n\nPlease fill out the form step-by-step.'
    );

    await askStep(ctx, 0);

    return ctx.wizard.next();
  },

  async (ctx) => {

    const state = ctx.wizard.state as RequestState;

    const currentStepIndex = state.stepIndex ?? 0;
    const currentStep = steps[currentStepIndex];

    let answer = '';

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {

      await ctx.answerCbQuery();

      answer = ctx.callbackQuery.data.replace('OPT_', '');

    } else if (ctx.message && 'text' in ctx.message) {

      answer = ctx.message.text;

    } else {

      return; // Ignore non-text/button events

    }

    state.answers[currentStep.key] = answer;

    const nextStepIndex = currentStepIndex + 1;

    state.stepIndex = nextStepIndex;

    if (nextStepIndex >= steps.length) {

      const data = {
        ...state.answers,
        submittedAt: new Date().toISOString()
      };

      try {

        const response = await fetch(
          'http://localhost:3000/api/submission',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          }
        );

        console.log('Response status:', response.status);

      } catch (error) {

        console.error('Failed to post request', error);

      }

      await ctx.reply(
        '✅ Form submitted and displayed on the website dashboard!'
      );

      return ctx.scene.leave();

    }

    await askStep(ctx, nextStepIndex);
  }
);

const bot = new Telegraf<Scenes.WizardContext>(
  '8665328311:AAEgWgELLW0f_6qxN_anpN_mmgSoIlah7Vs'
);

const stage = new Scenes.Stage<Scenes.WizardContext>([
  requestWizard
]);

bot.use(session());

bot.use(stage.middleware());

bot.start((ctx) => {
  ctx.scene.enter('REQUEST_WIZARD');
});

bot.launch();