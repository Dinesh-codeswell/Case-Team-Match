"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const stream_1 = require("stream");
const uuid_1 = require("uuid");
const matchmaking_1 = require("./matchmaking");
const app = (0, express_1.default)();
const port = 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const upload = (0, multer_1.default)();
app.post('/upload-csv', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    try {
        const csvData = req.file.buffer.toString();
        console.log('Received CSV data:', csvData.substring(0, 200) + '...');
        const participants = await parseCSVToParticipants(csvData);
        console.log(`Parsed ${participants.length} participants from CSV`);
        if (participants.length === 0) {
            return res.status(400).json({ error: 'No valid participants found in CSV.' });
        }
        const result = (0, matchmaking_1.matchParticipantsToTeams)(participants);
        res.json(result);
    }
    catch (error) {
        console.error('Error processing CSV:', error);
        res.status(500).json({ error: 'Failed to process CSV file.' });
    }
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
function parseCSVToParticipants(csvData) {
    return new Promise((resolve, reject) => {
        const participants = [];
        const stream = stream_1.Readable.from([csvData]);
        stream
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            try {
                console.log('Processing row:', row);
                const participant = {
                    id: (0, uuid_1.v4)(),
                    fullName: row['Full Name'] || '',
                    email: row['Email ID'] || '',
                    whatsappNumber: row['WhatsApp Number'] || '',
                    collegeName: row['College Name'] || '',
                    currentYear: parseCurrentYear(row['Current Year of Study']),
                    coreStrengths: parseCoreStrengths(row['Your Top 3 Core Strengths']),
                    preferredRoles: parsePreferredRoles(row['Preferred Role(s) in a Team']),
                    workingStyle: parseWorkingStyle(row['How do you prefer to work in a team?']),
                    idealTeamStructure: parseTeamStructure(row['Ideal Team Structure']),
                    lookingFor: parseLookingFor(row['Are you looking to...']),
                    availability: parseAvailability(row['Your Availability']),
                    experience: parseExperience(row['Previous Case Competition Experience']),
                    workStyle: parseWorkStyle(row['Preferred Work Style']),
                    casePreferences: parseCasePreferences(row['Which type(s) of case competitions are you most interested in?'])
                };
                if (participant.fullName && participant.email) {
                    participants.push(participant);
                    console.log(`Added participant: ${participant.fullName}`);
                }
                else {
                    console.warn('Skipping participant due to missing name or email');
                }
            }
            catch (error) {
                console.warn('Error parsing row:', error);
            }
        })
            .on('end', () => {
            console.log(`Successfully parsed ${participants.length} participants`);
            resolve(participants);
        })
            .on('error', (error) => {
            console.error('CSV parsing error:', error);
            reject(error);
        });
    });
}
function parseCurrentYear(value) {
    if (!value)
        return 'First Year';
    const normalized = value.toLowerCase().trim();
    if (normalized.includes('1st') || normalized.includes('first'))
        return 'First Year';
    if (normalized.includes('2nd') || normalized.includes('second'))
        return 'Second Year';
    if (normalized.includes('3rd') || normalized.includes('third'))
        return 'Third Year';
    if (normalized.includes('final'))
        return 'Final Year';
    if (normalized.includes('pg') || normalized.includes('mba')) {
        if (normalized.includes('1st') || normalized.includes('first'))
            return 'PG/MBA (1st Year)';
        return 'PG/MBA (2nd Year)';
    }
    return 'First Year';
}
function parseCoreStrengths(value) {
    if (!value)
        return [];
    const strengths = value.split(/[,;]/).map(s => s.trim());
    const validStrengths = [];
    const strengthMap = {
        'strategy & structuring': 'Strategy & Structuring',
        'data analysis & research': 'Data Analysis & Research',
        'financial modeling': 'Financial Modeling',
        'market research': 'Market Research',
        'presentation design (ppt/canva)': 'Presentation Design (PPT/Canva)',
        'public speaking & pitching': 'Public Speaking & Pitching',
        'time management & coordination': 'Time Management & Coordination',
        'innovation & ideation': 'Innovation & Ideation',
        'ui/ux or product thinking': 'UI/UX or Product Thinking',
        'storytelling': 'Storytelling',
        'technical (coding, app dev, automation)': 'Technical (Coding, App Dev, Automation)'
    };
    strengths.forEach(strength => {
        const normalized = strength.toLowerCase().trim();
        if (strengthMap[normalized]) {
            if (!validStrengths.includes(strengthMap[normalized])) {
                validStrengths.push(strengthMap[normalized]);
            }
        }
    });
    return validStrengths.slice(0, 3);
}
function parsePreferredRoles(value) {
    if (!value)
        return ['Flexible with any role'];
    const roles = value.split(/[,;]/).map(s => s.trim());
    const validRoles = [];
    const roleMap = {
        'team lead': 'Team Lead',
        'researcher': 'Researcher',
        'data analyst': 'Data Analyst',
        'designer': 'Designer',
        'presenter': 'Presenter',
        'coordinator': 'Coordinator',
        'flexible with any role': 'Flexible with any role'
    };
    roles.forEach(role => {
        const normalized = role.toLowerCase().trim();
        if (roleMap[normalized]) {
            if (!validRoles.includes(roleMap[normalized])) {
                validRoles.push(roleMap[normalized]);
            }
        }
    });
    return validRoles.length > 0 ? validRoles.slice(0, 2) : ['Flexible with any role'];
}
function parseWorkingStyle(value) {
    if (!value)
        return ['I prefer clearly divided responsibilities'];
    const styles = value.split(/[,;]/).map(s => s.trim());
    const validStyles = [];
    const styleMap = {
        'i like owning a task from start to finish': 'I like owning a task from start to finish',
        'i prefer clearly divided responsibilities': 'I prefer clearly divided responsibilities',
        'i enjoy brainstorming and team sessions': 'I enjoy brainstorming and team sessions',
        'i prefer working independently with regular updates': 'I prefer working independently with regular updates',
        'i like representing and presenting for the team': 'I like representing and presenting for the team',
        'i prefer backstage roles but ensure high-quality input': 'I prefer backstage roles but ensure high-quality input'
    };
    styles.forEach(style => {
        const normalized = style.toLowerCase().trim();
        if (styleMap[normalized]) {
            if (!validStyles.includes(styleMap[normalized])) {
                validStyles.push(styleMap[normalized]);
            }
        }
    });
    return validStyles.length > 0 ? validStyles : ['I prefer clearly divided responsibilities'];
}
function parseTeamStructure(value) {
    if (!value)
        return 'Flexible with any structure';
    const normalized = value.toLowerCase().trim();
    if (normalized.includes('similar'))
        return 'Similar skillsets across all members';
    if (normalized.includes('diverse'))
        return 'Diverse roles and specializations';
    return 'Flexible with any structure';
}
function parseLookingFor(value) {
    if (!value)
        return 'Open to both options';
    const normalized = value.toLowerCase().trim();
    if (normalized.includes('build') || normalized.includes('new team'))
        return 'Build a new team from scratch';
    if (normalized.includes('join') || normalized.includes('existing'))
        return 'Join an existing team';
    return 'Open to both options';
}
function parseAvailability(value) {
    if (!value)
        return 'Moderately Available (5–10 hrs/week)';
    const normalized = value.toLowerCase().trim();
    if (normalized.includes('fully available'))
        return 'Fully Available (10–15 hrs/week)';
    if (normalized.includes('lightly available'))
        return 'Lightly Available (1–4 hrs/week)';
    if (normalized.includes('not available'))
        return 'Not available now, but interested later';
    return 'Moderately Available (5–10 hrs/week)';
}
function parseExperience(value) {
    if (!value)
        return 'None';
    const normalized = value.toLowerCase().trim();
    if (normalized.includes('finalist') || normalized.includes('winner'))
        return 'Finalist/Winner in at least one';
    if (normalized.includes('3+') || normalized.includes('3 or more'))
        return 'Participated in 3+';
    if (normalized.includes('1–2') || normalized.includes('1-2') || normalized.includes('1 or 2'))
        return 'Participated in 1–2';
    return 'None';
}
function parseWorkStyle(value) {
    if (!value)
        return 'Combination of both';
    const normalized = value.toLowerCase().trim();
    if (normalized.includes('structured meetings and deadlines'))
        return 'Structured meetings and deadlines';
    if (normalized.includes('flexible work with async updates'))
        return 'Flexible work with async updates';
    return 'Combination of both';
}
function parseCasePreferences(value) {
    if (!value)
        return ["I'm open to all"];
    const preferences = value.split(/[,;]/).map(s => s.trim());
    const validPreferences = [];
    const preferenceMap = {
        'consulting': 'Consulting',
        'product/tech': 'Product/Tech',
        'marketing': 'Marketing',
        'social impact': 'Social Impact',
        'operations/supply chain': 'Operations/Supply Chain',
        'finance': 'Finance',
        'hr/people strategy': 'HR/People Strategy',
        'public policy/esg': 'Public Policy/ESG',
        'open-ended / interdisciplinary': 'Open-ended / Interdisciplinary',
        "i'm open to all": "I'm open to all"
    };
    preferences.forEach(preference => {
        const normalized = preference.toLowerCase().trim();
        if (preferenceMap[normalized]) {
            if (!validPreferences.includes(preferenceMap[normalized])) {
                validPreferences.push(preferenceMap[normalized]);
            }
        }
    });
    return validPreferences.length > 0 ? validPreferences : ["I'm open to all"];
}
