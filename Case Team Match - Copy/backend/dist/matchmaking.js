"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchParticipantsToTeams = matchParticipantsToTeams;
const uuid_1 = require("uuid");
const config = {
    preferredTeamSize: 4,
    minTeamSize: 3,
    maxTeamSize: 5,
    weights: {
        skillCompatibility: 0.25,
        experienceBalance: 0.20,
        availabilityMatch: 0.15,
        workStyleMatch: 0.15,
        caseTypeMatch: 0.15,
        educationLevelMatch: 0.10,
    },
};
const requiredRoles = {
    strategist: ['Strategy & Structuring', 'Innovation & Ideation'],
    analyst: ['Data Analysis & Research', 'Financial Modeling', 'Market Research'],
    communicator: ['Public Speaking & Pitching', 'Storytelling', 'Presentation Design (PPT/Canva)'],
    designer: ['UI/UX or Product Thinking', 'Storytelling', 'Presentation Design (PPT/Canva)']
};
const roleMapping = {
    'Team Lead': 'lead',
    'Researcher': 'researcher',
    'Data Analyst': 'analyst',
    'Designer': 'designer',
    'Presenter': 'presenter',
    'Coordinator': 'coordinator',
    'Flexible with any role': 'flexible'
};
function matchParticipantsToTeams(participants) {
    console.log(`Starting hierarchical matchmaking for ${participants.length} participants`);
    const ugParticipants = participants.filter(p => !p.currentYear.includes('PG') && !p.currentYear.includes('MBA'));
    const pgParticipants = participants.filter(p => p.currentYear.includes('PG') || p.currentYear.includes('MBA'));
    console.log(`Education level separation: ${ugParticipants.length} UG, ${pgParticipants.length} PG`);
    const ugTeams = formTeamsHierarchical(ugParticipants);
    const pgTeams = formTeamsHierarchical(pgParticipants);
    const allTeams = [...ugTeams.teams, ...pgTeams.teams];
    const unmatched = [...ugTeams.unmatched, ...pgTeams.unmatched];
    const statistics = {
        totalParticipants: participants.length,
        teamsFormed: allTeams.length,
        averageTeamSize: allTeams.length > 0 ?
            allTeams.reduce((acc, team) => acc + team.teamSize, 0) / allTeams.length : 0,
        matchingEfficiency: participants.length > 0 ?
            ((participants.length - unmatched.length) / participants.length) * 100 : 0,
    };
    console.log(`Hierarchical matching complete: ${allTeams.length} teams formed, ${unmatched.length} unmatched`);
    return { teams: allTeams, unmatched, statistics };
}
function formTeamsHierarchical(participants) {
    if (participants.length === 0) {
        return { teams: [], unmatched: [] };
    }
    const teams = [];
    const availableParticipants = [...participants];
    availableParticipants.sort((a, b) => getExperienceScore(b) - getExperienceScore(a));
    console.log(`Forming teams from ${availableParticipants.length} participants`);
    while (availableParticipants.length >= config.minTeamSize) {
        const team = createTeamWithHierarchicalLogic(availableParticipants);
        if (team && team.members.length >= config.minTeamSize) {
            teams.push(team);
            console.log(`Formed team with ${team.members.length} members`);
            team.members.forEach(member => {
                const index = availableParticipants.findIndex(p => p.id === member.id);
                if (index !== -1) {
                    availableParticipants.splice(index, 1);
                }
            });
        }
        else {
            console.log(`Could not form team from ${availableParticipants.length} remaining participants`);
            break;
        }
    }
    console.log(`Team formation complete: ${teams.length} teams, ${availableParticipants.length} unmatched`);
    return { teams, unmatched: availableParticipants };
}
function createTeamWithHierarchicalLogic(participants) {
    if (participants.length < config.minTeamSize)
        return null;
    const anchor = participants[0];
    const team = [anchor];
    const remaining = participants.slice(1);
    console.log(`Starting team with anchor: ${anchor.fullName} (${anchor.currentYear})`);
    while (team.length < config.maxTeamSize && remaining.length > 0) {
        const nextMember = findBestMatchHierarchical(team, remaining);
        if (nextMember) {
            team.push(nextMember);
            console.log(`Added member: ${nextMember.fullName} (${nextMember.currentYear})`);
            const index = remaining.findIndex(p => p.id === nextMember.id);
            remaining.splice(index, 1);
        }
        else {
            console.log(`No suitable member found for team of size ${team.length}`);
            break;
        }
    }
    if (team.length < config.minTeamSize) {
        console.log(`Team too small (${team.length} members), discarding`);
        return null;
    }
    console.log(`Created team with ${team.length} members`);
    return createTeamObject(team);
}
function findBestMatchHierarchical(currentTeam, candidates) {
    if (currentTeam.length >= config.preferredTeamSize) {
        console.log('Team at preferred size, stopping');
        return null;
    }
    console.log(`Finding match for team of size ${currentTeam.length} from ${candidates.length} candidates`);
    const candidatesWithCaseMatch = filterByCaseTypeCompatibility(currentTeam, candidates);
    console.log(`After case type filtering: ${candidatesWithCaseMatch.length} candidates`);
    if (candidatesWithCaseMatch.length === 0) {
        console.log('No candidates with case type compatibility');
        return null;
    }
    const candidatesWithoutRoleConflicts = filterByRoleCompatibility(currentTeam, candidatesWithCaseMatch);
    console.log(`After role filtering: ${candidatesWithoutRoleConflicts.length} candidates`);
    if (candidatesWithoutRoleConflicts.length === 0) {
        console.log('No candidates without role conflicts');
        return null;
    }
    const candidatesWithSkillBalance = filterBySkillComplementarity(currentTeam, candidatesWithoutRoleConflicts);
    console.log(`After skill filtering: ${candidatesWithSkillBalance.length} candidates`);
    if (candidatesWithSkillBalance.length === 0) {
        console.log('No candidates that maintain skill balance');
        return null;
    }
    const candidatesWithExperienceBalance = filterByExperienceBalance(currentTeam, candidatesWithSkillBalance);
    console.log(`After experience filtering: ${candidatesWithExperienceBalance.length} candidates`);
    if (candidatesWithExperienceBalance.length === 0) {
        console.log('No candidates that maintain experience balance');
        return null;
    }
    const candidatesWithAvailabilityMatch = filterByAvailabilityMatch(currentTeam, candidatesWithExperienceBalance);
    console.log(`After availability filtering: ${candidatesWithAvailabilityMatch.length} candidates`);
    if (candidatesWithAvailabilityMatch.length === 0) {
        console.log('No candidates with availability match');
        return null;
    }
    const bestCandidate = selectBestCandidate(currentTeam, candidatesWithAvailabilityMatch);
    if (bestCandidate) {
        console.log(`Selected best candidate: ${bestCandidate.fullName}`);
    }
    return bestCandidate;
}
function filterByCaseTypeCompatibility(team, candidates) {
    if (team.length === 0)
        return candidates;
    const teamCaseTypes = team.flatMap(member => member.casePreferences);
    return candidates.filter(candidate => {
        if (teamCaseTypes.length === 0 || candidate.casePreferences.includes("I'm open to all")) {
            return true;
        }
        return candidate.casePreferences.some(caseType => teamCaseTypes.includes(caseType) || caseType === "I'm open to all");
    });
}
function filterByRoleCompatibility(team, candidates) {
    const teamRoles = team.flatMap(member => member.preferredRoles);
    const roleCounts = countRoles(teamRoles);
    return candidates.filter(candidate => {
        const candidateRoles = candidate.preferredRoles;
        for (const role of candidateRoles) {
            if (role === 'Flexible with any role')
                continue;
            const roleKey = roleMapping[role];
            if (roleKey === 'lead' && roleCounts.lead >= 3)
                return false;
            if (roleKey === 'designer' && roleCounts.designer >= 3)
                return false;
            if (roleKey === 'presenter' && roleCounts.presenter >= 3)
                return false;
        }
        return true;
    });
}
function filterBySkillComplementarity(team, candidates) {
    return candidates.filter(candidate => {
        const teamWithCandidate = [...team, candidate];
        const hasStrategist = hasSkillFromCategory(teamWithCandidate, requiredRoles.strategist);
        const hasAnalyst = hasSkillFromCategory(teamWithCandidate, requiredRoles.analyst);
        const hasCommunicator = hasSkillFromCategory(teamWithCandidate, requiredRoles.communicator);
        const hasDesigner = hasSkillFromCategory(teamWithCandidate, requiredRoles.designer);
        const requiredRolesCovered = [hasStrategist, hasAnalyst, hasCommunicator, hasDesigner]
            .filter(Boolean).length >= 2;
        return requiredRolesCovered;
    });
}
function filterByExperienceBalance(team, candidates) {
    const teamExperienceScores = team.map(getExperienceScore);
    const hasExperiencedMember = teamExperienceScores.some(score => score >= 3);
    return candidates.filter(candidate => {
        const candidateExperience = getExperienceScore(candidate);
        if (hasExperiencedMember)
            return true;
        return true;
    });
}
function filterByAvailabilityMatch(team, candidates) {
    if (team.length === 0)
        return candidates;
    const teamAvailabilityScores = team.map(getAvailabilityScore);
    const avgTeamAvailability = teamAvailabilityScores.reduce((a, b) => a + b, 0) / teamAvailabilityScores.length;
    return candidates.filter(candidate => {
        const candidateAvailability = getAvailabilityScore(candidate);
        const availabilityDiff = Math.abs(candidateAvailability - avgTeamAvailability);
        return availabilityDiff <= 2;
    });
}
function selectBestCandidate(team, candidates) {
    if (candidates.length === 0)
        return null;
    let bestCandidate = null;
    let bestScore = -1;
    for (const candidate of candidates) {
        const score = calculateHierarchicalCompatibilityScore(team, candidate);
        if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
        }
    }
    return bestCandidate;
}
function calculateHierarchicalCompatibilityScore(team, candidate) {
    const teamWithCandidate = [...team, candidate];
    let score = 0;
    const teamExperienceScores = team.map(getExperienceScore);
    const hasExperiencedMember = teamExperienceScores.some(score => score >= 3);
    const candidateExperience = getExperienceScore(candidate);
    if (!hasExperiencedMember && candidateExperience >= 3) {
        score += 0.4;
    }
    else if (candidateExperience >= 3) {
        score += 0.2;
    }
    const teamAvailabilityScores = team.map(getAvailabilityScore);
    const avgTeamAvailability = teamAvailabilityScores.reduce((a, b) => a + b, 0) / teamAvailabilityScores.length;
    const candidateAvailability = getAvailabilityScore(candidate);
    const availabilityDiff = Math.abs(candidateAvailability - avgTeamAvailability);
    score += (1 - availabilityDiff * 0.2) * 0.3;
    const uniqueSkills = new Set(teamWithCandidate.flatMap(member => member.coreStrengths)).size;
    const totalSkills = teamWithCandidate.reduce((total, member) => total + member.coreStrengths.length, 0);
    if (totalSkills > 0) {
        const diversityBonus = (uniqueSkills / totalSkills) * 0.3;
        score += diversityBonus;
    }
    return Math.min(score, 1.0);
}
function countRoles(roles) {
    const counts = {
        lead: 0,
        researcher: 0,
        analyst: 0,
        designer: 0,
        presenter: 0,
        coordinator: 0,
        flexible: 0
    };
    roles.forEach(role => {
        const roleKey = roleMapping[role];
        if (roleKey) {
            counts[roleKey]++;
        }
    });
    return counts;
}
function hasSkillFromCategory(team, skillCategory) {
    return team.some(member => member.coreStrengths.some(skill => skillCategory.includes(skill)));
}
function createTeamObject(members) {
    const skillVector = createSkillVector(members);
    const compatibilityScore = calculateTeamCompatibilityScore(members);
    const averageExperience = members.reduce((sum, member) => sum + getExperienceScore(member), 0) / members.length;
    const commonCaseTypes = findCommonCaseTypes(members);
    const workStyleCompatibility = determineWorkStyleCompatibility(members);
    return {
        id: (0, uuid_1.v4)(),
        members,
        skillVector,
        compatibilityScore,
        teamSize: members.length,
        averageExperience,
        commonCaseTypes,
        workStyleCompatibility
    };
}
function createSkillVector(team) {
    const allSkills = [
        'Strategy & Structuring',
        'Data Analysis & Research',
        'Financial Modeling',
        'Market Research',
        'Presentation Design (PPT/Canva)',
        'Public Speaking & Pitching',
        'Time Management & Coordination',
        'Innovation & Ideation',
        'UI/UX or Product Thinking',
        'Storytelling',
        'Technical (Coding, App Dev, Automation)'
    ];
    return allSkills.map(skill => {
        const memberCount = team.filter(member => member.coreStrengths.includes(skill)).length;
        return memberCount > 0 ? 1 : 0;
    });
}
function calculateTeamCompatibilityScore(team) {
    if (team.length <= 1)
        return 100;
    let totalScore = 0;
    const weights = config.weights;
    totalScore += calculateSkillCompatibility(team) * weights.skillCompatibility;
    totalScore += calculateExperienceBalance(team) * weights.experienceBalance;
    totalScore += calculateAvailabilityMatch(team) * weights.availabilityMatch;
    totalScore += calculateWorkStyleCompatibility(team) * weights.workStyleMatch;
    totalScore += calculateCaseTypeMatch(team) * weights.caseTypeMatch;
    totalScore += 1.0 * weights.educationLevelMatch;
    return totalScore * 100;
}
function calculateSkillCompatibility(team) {
    const hasStrategist = hasSkillFromCategory(team, requiredRoles.strategist);
    const hasAnalyst = hasSkillFromCategory(team, requiredRoles.analyst);
    const hasCommunicator = hasSkillFromCategory(team, requiredRoles.communicator);
    const hasDesigner = hasSkillFromCategory(team, requiredRoles.designer);
    let score = 0;
    if (hasStrategist)
        score += 0.25;
    if (hasAnalyst)
        score += 0.25;
    if (hasCommunicator)
        score += 0.25;
    if (hasDesigner)
        score += 0.25;
    const totalSkills = team.reduce((total, member) => total + member.coreStrengths.length, 0);
    const uniqueSkills = new Set(team.flatMap(member => member.coreStrengths)).size;
    if (totalSkills > 0) {
        const diversityBonus = (uniqueSkills / totalSkills) * 0.5;
        score += diversityBonus;
    }
    return Math.min(score, 1.0);
}
function calculateExperienceBalance(team) {
    const experienceScores = team.map(getExperienceScore);
    const avgExperience = experienceScores.reduce((a, b) => a + b, 0) / experienceScores.length;
    const hasExperienced = experienceScores.some(score => score >= 3);
    let score = 0.5;
    if (hasExperienced)
        score += 0.3;
    const variance = experienceScores.reduce((acc, score) => acc + Math.pow(score - avgExperience, 2), 0) / experienceScores.length;
    const balanceBonus = Math.max(0, 0.2 - (variance * 0.1));
    score += balanceBonus;
    return Math.min(score, 1.0);
}
function calculateAvailabilityMatch(team) {
    const availabilityScores = team.map(getAvailabilityScore);
    const avgAvailability = availabilityScores.reduce((a, b) => a + b, 0) / availabilityScores.length;
    const variance = availabilityScores.reduce((acc, score) => acc + Math.pow(score - avgAvailability, 2), 0) / availabilityScores.length;
    return Math.max(0, 1.0 - (variance * 0.5));
}
function calculateWorkStyleCompatibility(team) {
    const workStyles = team.map(member => member.workStyle);
    const structuredCount = workStyles.filter(style => style === 'Structured meetings and deadlines').length;
    const flexibleCount = workStyles.filter(style => style === 'Flexible work with async updates').length;
    const combinationCount = workStyles.filter(style => style === 'Combination of both').length;
    if (combinationCount === team.length)
        return 1.0;
    if (structuredCount === team.length)
        return 0.9;
    if (flexibleCount === team.length)
        return 0.9;
    if (combinationCount > 0)
        return 0.8;
    return 0.6;
}
function calculateCaseTypeMatch(team) {
    const allCaseTypes = team.flatMap(member => member.casePreferences);
    const uniqueCaseTypes = new Set(allCaseTypes);
    const commonTypes = [];
    for (const caseType of uniqueCaseTypes) {
        const memberCount = team.filter(member => member.casePreferences.includes(caseType)).length;
        if (memberCount >= Math.ceil(team.length / 2)) {
            commonTypes.push(caseType);
        }
    }
    if (commonTypes.includes("I'm open to all"))
        return 1.0;
    if (commonTypes.length >= 3)
        return 0.9;
    if (commonTypes.length >= 2)
        return 0.8;
    if (commonTypes.length >= 1)
        return 0.7;
    return 0.5;
}
function findCommonCaseTypes(team) {
    const allCaseTypes = team.flatMap(member => member.casePreferences);
    const uniqueCaseTypes = new Set(allCaseTypes);
    const commonTypes = [];
    for (const caseType of uniqueCaseTypes) {
        const memberCount = team.filter(member => member.casePreferences.includes(caseType)).length;
        if (memberCount >= Math.ceil(team.length / 2)) {
            commonTypes.push(caseType);
        }
    }
    return commonTypes;
}
function determineWorkStyleCompatibility(team) {
    const workStyles = team.map(member => member.workStyle);
    const uniqueStyles = new Set(workStyles);
    if (uniqueStyles.size === 1) {
        return workStyles[0];
    }
    const hasCombination = workStyles.some(style => style === 'Combination of both');
    if (hasCombination) {
        return 'Flexible approach with mixed preferences';
    }
    return 'Mixed structured and flexible approaches';
}
function getExperienceScore(participant) {
    switch (participant.experience) {
        case 'Finalist/Winner in at least one': return 4;
        case 'Participated in 3+': return 3;
        case 'Participated in 1–2': return 2;
        case 'None': return 1;
        default: return 1;
    }
}
function getAvailabilityScore(participant) {
    switch (participant.availability) {
        case 'Fully Available (10–15 hrs/week)': return 4;
        case 'Moderately Available (5–10 hrs/week)': return 3;
        case 'Lightly Available (1–4 hrs/week)': return 2;
        case 'Not available now, but interested later': return 1;
        default: return 3;
    }
}
