/**
 * CBT Workbook Application Data
 * 
 * Consolidated data storage for the application.
 * This module replaces individual JSON files with direct exports.
 */

/**
 * Beck Depression Inventory (BDI) Quiz Data
 */
const bdiQuizData = {
    title: "Beck Depression Inventory",
    description: "The Beck Depression Inventory (BDI) is a self-report rating inventory that measures characteristic attitudes and symptoms of depression.",
    instructions: "This questionnaire consists of 21 groups of statements. Please read each group of statements carefully, and then pick out the one statement in each group that best describes the way you have been feeling during the past two weeks, including today.",
    questions: [
        {
            id: "sadness",
            text: "Do I feel sad?",
            options: [
                { value: 0, text: "Not at all." },
                { value: 1, text: "I do feel sad." },
                { value: 2, text: "I am sad all the time and I can't snap out of it." },
                { value: 3, text: "I am so sad and unhappy that I can't stand it." }
            ]
        },
        {
            id: "pessimism",
            text: "Do I feel hopeless about the future?",
            options: [
                { value: 0, text: "Not at all." },
                { value: 1, text: "I do feel discouraged about the future." },
                { value: 2, text: "I feel I have nothing to look forward to." },
                { value: 3, text: "I feel the future is hopeless and that things cannot improve." }
            ]
        },
        {
            id: "failure",
            text: "Do I feel like a failure?",
            options: [
                { value: 0, text: "Not at all." },
                { value: 1, text: "I feel I have failed more than the average person." },
                { value: 2, text: "As I look back on my life, all I can see is a lot of failures." },
                { value: 3, text: "I feel I am a complete failure as a person." }
            ]
        },
        {
            id: "dissatisfaction",
            text: "Do I feel satisfied?",
            options: [
                { value: 0, text: "I get as much satisfaction out of things as I used to." },
                { value: 1, text: "I don't enjoy the things the way I used to." },
                { value: 2, text: "I don't get real satisfaction out of anything anymore." },
                { value: 3, text: "I am dissatisfied or bored with everything." }
            ]
        },
        {
            id: "guilt",
            text: "Do I feel guilty?",
            options: [
                { value: 0, text: "Not at all." },
                { value: 1, text: "I feel guilty a good part of the time." },
                { value: 2, text: "I feel quite guilty most of the time." },
                { value: 3, text: "I feel guilty all of the time." }
            ]
        },
        {
            id: "punishment",
            text: "Do I feel I am being punished?",
            options: [
                { value: 0, text: "Not at all." },
                { value: 1, text: "I feel I may be punished." },
                { value: 2, text: "I expect to be punished." },
                { value: 3, text: "I feel I am being punished." }
            ]
        },
        {
            id: "self_dislike",
            text: "Am I disappointed in myself?",
            options: [
                { value: 0, text: "Not at all." },
                { value: 1, text: "I am disappointed in myself." },
                { value: 2, text: "I am disgusted with myself." },
                { value: 3, text: "I hate myself." }
            ]
        },
        {
            id: "self_criticalness",
            text: "Do I criticize or blame myself?",
            options: [
                { value: 0, text: "Not at all." },
                { value: 1, text: "I am more critical of myself than I used to be." },
                { value: 2, text: "I criticize myself for all of my faults." },
                { value: 3, text: "I blame myself for everything bad that happens." }
            ]
        },
        {
            id: "suicidal_thoughts",
            text: "Do I have any thoughts of harming myself?",
            options: [
                { value: 0, text: "Not at all." },
                { value: 1, text: "I have thoughts of harming myself, but would not carry them out." },
                { value: 2, text: "I would like to harm myself." },
                { value: 3, text: "I would harm myself if I had the chance." }
            ]
        },
        {
            id: "crying",
            text: "Do I cry?",
            options: [
                { value: 0, text: "I don't cry any more than usual." },
                { value: 1, text: "I cry more than I used to." },
                { value: 2, text: "I cry over every little thing." },
                { value: 3, text: "I feel like crying, but I can't." }
            ]
        },
        {
            id: "agitation",
            text: "Am I agitated?",
            options: [
                { value: 0, text: "I am no more restless or wound up than usual." },
                { value: 1, text: "I feel more restless or wound up than usual." },
                { value: 2, text: "I am so restless or agitated that it's hard to stay still." },
                { value: 3, text: "I am so restless or agitated that I have to keep moving or doing something." }
            ]
        },
        {
            id: "loss_of_interest",
            text: "Have I lost interest in other people or activities?",
            options: [
                { value: 0, text: "I have not lost interest in other people or activities." },
                { value: 1, text: "I am less interested in other people or things than before." },
                { value: 2, text: "I have lost most of my interest in other people or things." },
                { value: 3, text: "It's hard to get interested in anything." }
            ]
        },
        {
            id: "indecisiveness",
            text: "Am I indecisive?",
            options: [
                { value: 0, text: "I make decisions about as well as ever." },
                { value: 1, text: "I find it more difficult to make decisions than usual." },
                { value: 2, text: "I have much greater difficulty in making decisions than I used to." },
                { value: 3, text: "I have trouble making any decisions." }
            ]
        },
        {
            id: "worthlessness",
            text: "Do I feel worthless?",
            options: [
                { value: 0, text: "I do not feel worthless." },
                { value: 1, text: "I don't consider myself as worthwhile and useful as I used to." },
                { value: 2, text: "I feel more worthless as compared to other people." },
                { value: 3, text: "I feel utterly worthless." }
            ]
        },
        {
            id: "loss_of_energy",
            text: "Do I have enough energy?",
            options: [
                { value: 0, text: "I have as much energy as ever." },
                { value: 1, text: "I have less energy than I used to have." },
                { value: 2, text: "I don't have enough energy to do very much." },
                { value: 3, text: "I don't have enough energy to do anything." }
            ]
        },
        {
            id: "changes_in_sleep",
            text: "Any changes in my sleep patterns?",
            options: [
                { value: 0, text: "I can sleep as well as usual." },
                { value: 1, text: "I don't sleep as well as I used to." },
                { value: 2, text: "I wake up 1-2 hours earlier than usual and find it hard to get back to sleep." },
                { value: 3, text: "I wake up several hours earlier than I used to and cannot get back to sleep." }
            ]
        },
        {
            id: "irritability",
            text: "Am I irritable?",
            options: [
                { value: 0, text: "I am no more irritable than usual." },
                { value: 1, text: "I am more irritable than usual." },
                { value: 2, text: "I am much more irritable than usual." },
                { value: 3, text: "I am irritable all the time." }
            ]
        },
        {
            id: "changes_in_appetite",
            text: "Have I experienced any changes in my appetite?",
            options: [
                { value: 0, text: "My appetite is no worse than usual." },
                { value: 1, text: "My appetite is not as good as it used to be." },
                { value: 2, text: "My appetite is much worse now." },
                { value: 3, text: "I have no appetite at all anymore." }
            ]
        },
        {
            id: "concentration_difficulty",
            text: "Can I concentrate?",
            options: [
                { value: 0, text: "I can concentrate as well as ever." },
                { value: 1, text: "I can't concentrate as well as usual." },
                { value: 2, text: "It's hard to keep my mind on anything for very long." },
                { value: 3, text: "I find I can't concentrate on anything." }
            ]
        },
        {
            id: "tiredness",
            text: "Am I tired?",
            options: [
                { value: 0, text: "I am no more tired or fatigued than usual." },
                { value: 1, text: "I get more tired or fatigued more easily than usual." },
                { value: 2, text: "I am too tired or fatigued to do a lot of the things I used to do." },
                { value: 3, text: "I am too tired or fatigued to do most of the things I used to do." }
            ]
        },
        {
            id: "loss_of_interest_in_sex",
            text: "What about my libido?",
            options: [
                { value: 0, text: "I have not noticed any recent change in my interest in sex." },
                { value: 1, text: "I am less interested in sex than I used to be." },
                { value: 2, text: "I have almost no interest in sex." },
                { value: 3, text: "I have lost interest in sex completely." }
            ]
        }
    ],
    interpretations: [
        { range: [0, 10], label: "These ups and downs are considered normal" },
        { range: [11, 16], label: "Mild mood disturbance" },
        { range: [17, 20], label: "Borderline clinical depression" },
        { range: [21, 30], label: "Moderate depression" },
        { range: [31, 40], label: "Severe depression" },
        { range: [41, 63], label: "Extreme depression" }
    ]
};

/**
 * Cognitive Distortions Reference Data
 */
const cognitiveDistortions = [
    {
        name: "All-or-Nothing Thinking",
        description: "You see things in black-and-white categories. If your performance falls short of perfect, you see yourself as a total failure."
    },
    {
        name: "Overgeneralization",
        description: "You view a single negative event as a never-ending pattern of defeat."
    },
    {
        name: "Mental Filter",
        description: "You pick out a single negative detail and dwell on it exclusively, so that your vision of all reality becomes darkened."
    },
    {
        name: "Disqualifying the Positive",
        description: "You reject positive experiences by insisting they 'don't count'."
    },
    {
        name: "Jumping to Conclusions",
        description: "You make a negative interpretation even though there are no definite facts that convincingly support your conclusion."
    },
    {
        name: "Mind Reading",
        description: "You arbitrarily conclude that someone is reacting negatively to you, and you don't bother to check this out."
    },
    {
        name: "Fortune Telling",
        description: "You anticipate that things will turn out badly, and you feel convinced that your prediction is an already established fact."
    },
    {
        name: "Magnification / Minimization",
        description: "You exaggerate the importance of your problems and shortcomings, or you minimize the importance of your desirable qualities."
    },
    {
        name: "Emotional Reasoning",
        description: "You assume that your negative emotions necessarily reflect the way things really are."
    },
    {
        name: "Should Statements",
        description: "You try to motivate yourself with shoulds and shouldn'ts, as if you had to be punished before you could be expected to do anything."
    },
    {
        name: "Labeling",
        description: "You assign labels to yourself or others. Instead of saying, 'I made a mistake,' you say, 'I'm a loser.'"
    },
    {
        name: "Personalization and Blame",
        description: "You hold yourself personally responsible for an event over which you have no control."
    }
];

/**
 * Activity Planner Template
 */
const activityPlannerTemplate = {
    title: "Activity Planner",
    description: "Plan and reflect on mood-improving activities.",
    fields: [
        "Activity",
        "Time Slot",
        "Anticipated Emotion + Intensity",
        "Did It?",
        "Emotion After + Intensity",
        "Reflection Notes"
    ]
};

/**
 * Mood Logger Template
 */
const moodLoggerTemplate = {
    title: "Mood Logger",
    description: "Log your mood throughout the day.",
    fields: [
        "Date",
        "Time",
        "Mood (label)",
        "Intensity (1-10)",
        "Notes / Context"
    ]
};

/**
 * Gratitude Journal Template
 */
const gratitudeJournalTemplate = {
    title: "Gratitude Journal",
    description: "Log things you're grateful for to improve perspective.",
    fields: [
        "Date",
        "Gratitude Entry",
        "Why it mattered to you"
    ]
};

/**
 * Goal/Habit Tracker Template
 */
const goalTrackerTemplate = {
    title: "Goal/Habit Tracker",
    description: "Track and reflect on your goals and habits.",
    fields: [
        "Goal / Habit",
        "Target Frequency",
        "Completed (Yes/No or Count)",
        "Notes / Reflection"
    ]
};

/**
 * Thought Record Template
 */
const thoughtRecordTemplate = {
    title: "Thought Record",
    description: "Record, analyze, and reframe automatic negative thoughts.",
    fields: cognitiveDistortions.map(distortion => [distortion.name, distortion.description])
};

// List of symptom options
const symptomOptions = [
    'Headache', 
    'Tension', 
    'Fatigue', 
    'Restlessness', 
    'Nausea', 
    'Dizziness', 
    'Racing heart', 
    'Trouble sleeping'
  ];

// Export all data as structured objects
module.exports = {
    bdiQuizData,
    cognitiveDistortions,
    activityPlannerTemplate,
    moodLoggerTemplate,
    gratitudeJournalTemplate,
    goalTrackerTemplate,
    thoughtRecordTemplate,
    symptomOptions,

    // For backward compatibility and easier importing
    getAllData() {
        return {
            bdi_quiz: bdiQuizData,
            thought_record_template: thoughtRecordTemplate,
            activity_planner_template: activityPlannerTemplate,
            mood_logger_template: moodLoggerTemplate,
            gratitude_journal_template: gratitudeJournalTemplate,
            goal_tracker_template: goalTrackerTemplate,
            symptom_options: symptomOptions,
        };
    }
};