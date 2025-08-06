import { v4 as uuidv4 } from 'uuid';
import { Participant, CoreStrength, PreferredRole, WorkingStyle, CaseType } from './types';
import csv from 'csv-parser';

export async function parseCSVToParticipants(csvData: string): Promise<Participant[]> {
  return new Promise((resolve, reject) => {
    const participants: Participant[] = [];
    let headers: string[] = [];

    const stream = require('stream');
    const readable = new stream.Readable();
    readable.push(csvData);
    readable.push(null);

    readable
      .pipe(csv())
      .on('headers', (headerList: string[]) => {
        headers = headerList;
        console.log('CSV Headers:', headers);
      })
      .on('data', (row: any) => {
        console.log('Processing row:', row);

        try {
          const participant: Participant = {
            id: uuidv4(),
            fullName: row['Full Name'] || '',
            email: row['Email ID'] || '',
            whatsappNumber: row['WhatsApp Number'] || '',
            collegeName: row['College Name'] || '',
            currentYear: parseCurrentYear(row['Current Year of Study']),
            coreStrengths: parseCoreStrengths(row['Top 3 Core Strengths']),
            preferredRoles: parsePreferredRoles(row['Preferred Role(s)']),
            workingStyle: parseWorkingStyle(row['Availability (next 2–4 weeks)']),
            idealTeamStructure: 'Diverse roles and specializations', // Default value
            lookingFor: 'Build a new team from scratch', // Default value
            availability: parseAvailability(row['Availability (next 2–4 weeks)']),
            experience: parseExperience(row['Previous Case Comp Experience']),
            workStyle: 'Combination of both', // Default value
            casePreferences: parseCasePreferences(row['Case Comp Preferences']),
            preferredTeamSize: parsePreferredTeamSize(row['Preferred Team Size'])
          };

          participants.push(participant);
          console.log(`Added participant: ${participant.fullName}`);
        } catch (error) {
          console.error('Error parsing row:', error);
        }
      })
      .on('end', () => {
        console.log(`Successfully parsed ${participants.length} participants`);
        resolve(participants);
      })
      .on('error', (error: any) => {
        console.error('Error parsing CSV:', error);
        reject(error);
      });
  });
}

function parseCurrentYear(value: string): Participant['currentYear'] {
  if (!value) return 'First Year';
  const normalized = value.toLowerCase().trim();
  
  if (normalized.includes('1st') || normalized.includes('1')) return 'First Year';
  if (normalized.includes('2nd') || normalized.includes('2')) return 'Second Year';
  if (normalized.includes('3rd') || normalized.includes('3')) return 'Third Year';
  if (normalized.includes('4th') || normalized.includes('4')) return 'Final Year';
  if (normalized.includes('pg') || normalized.includes('mba')) return 'PG/MBA (1st Year)';
  
  return 'First Year';
}

function parseCoreStrengths(value: string): CoreStrength[] {
  if (!value) return [];
  const strengths = value.split(/[;,\n]/).map(s => s.trim());
  const validStrengths: CoreStrength[] = [];
  
  const strengthMap: { [key: string]: CoreStrength } = {
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
      validStrengths.push(strengthMap[normalized]);
    }
  });

  return validStrengths.slice(0, 3); // Limit to 3 strengths
}

function parsePreferredRoles(value: string): PreferredRole[] {
  if (!value) return [];
  const roles = value.split(/[;,\n]/).map(s => s.trim());
  const validRoles: PreferredRole[] = [];
  
  const roleMap: { [key: string]: PreferredRole } = {
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
      validRoles.push(roleMap[normalized]);
    }
  });

  return validRoles.slice(0, 2); // Limit to 2 roles
}

function parseWorkingStyle(value: string): WorkingStyle[] {
  // Default working styles based on availability
  return [
    'I like owning a task from start to finish',
    'I enjoy brainstorming and team sessions'
  ];
}

function parseAvailability(value: string): Participant['availability'] {
  if (!value) return 'Moderately Available (5–10 hrs/week)';
  const normalized = value.toLowerCase().trim();
  
  if (normalized.includes('fully available') || normalized.includes('10–15')) {
    return 'Fully Available (10–15 hrs/week)';
  }
  if (normalized.includes('moderately available') || normalized.includes('5–10')) {
    return 'Moderately Available (5–10 hrs/week)';
  }
  if (normalized.includes('lightly available') || normalized.includes('1–4')) {
    return 'Lightly Available (1–4 hrs/week)';
  }
  
  return 'Moderately Available (5–10 hrs/week)';
}

function parseExperience(value: string): Participant['experience'] {
  if (!value) return 'None';
  const normalized = value.toLowerCase().trim();
  
  if (normalized.includes('finalist') || normalized.includes('winner')) {
    return 'Finalist/Winner in at least one';
  }
  if (normalized.includes('3+') || normalized.includes('3 or more')) {
    return 'Participated in 3+';
  }
  if (normalized.includes('1–2') || normalized.includes('1-2')) {
    return 'Participated in 1–2';
  }
  
  return 'None';
}

function parseCasePreferences(value: string): CaseType[] {
  if (!value) return ['Consulting']; // Default to Consulting
  const preferences = value.split(/[;,\n]/).map(s => s.trim());
  const validPreferences: CaseType[] = [];
  
  const preferenceMap: { [key: string]: CaseType } = {
    'consulting': 'Consulting',
    'product/tech': 'Product/Tech',
    'marketing': 'Marketing',
    'social impact': 'Social Impact',
    'operations/supply chain': 'Operations/Supply Chain',
    'finance': 'Finance',
    'public policy/esg': 'Public Policy/ESG'
  };

  preferences.forEach(preference => {
    const normalized = preference.toLowerCase().trim();
    if (preferenceMap[normalized]) {
      if (!validPreferences.includes(preferenceMap[normalized])) {
        validPreferences.push(preferenceMap[normalized]);
      }
    }
  });

  return validPreferences.length > 0 ? validPreferences.slice(0, 3) : ['Consulting']; // Limit to 3 preferences
}

function parsePreferredTeamSize(value: string): 2 | 3 | 4 {
  if (!value) return 4; // Default to 4
  const normalized = value.toLowerCase().trim();
  if (normalized === '2' || normalized.includes('2')) return 2;
  if (normalized === '3' || normalized.includes('3')) return 3;
  if (normalized === '4' || normalized.includes('4')) return 4;
  return 4; // Default to 4
} 