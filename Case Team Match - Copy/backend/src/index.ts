import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { matchParticipantsToTeams } from './matchmaking';
import { parseCSVToParticipants } from './csv-parser';
import { MatchingResult } from './types';

// Express setup
const app = express();
const port = 4000;
app.use(cors());
app.use(express.json());

const upload = multer();
app.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
  console.log('Received upload request');
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  console.log(`File received: ${req.file.originalname}, size: ${req.file.size} bytes`);

  try {
    // Process CSV data
    const csvData = req.file.buffer.toString();
    console.log('Received CSV data:', csvData.substring(0, 200) + '...');
    
    const participants = await parseCSVToParticipants(csvData);
    
    console.log(`Parsed ${participants.length} participants from CSV`);
    
    if (participants.length === 0) {
      return res.status(400).json({ error: 'No valid participants found in CSV.' });
    }

    // Run matchmaking algorithm
    console.log('Starting matchmaking algorithm...');
    const result: MatchingResult = matchParticipantsToTeams(participants);
    console.log(`Matchmaking complete: ${result.teams.length} teams formed, ${result.unmatched.length} unmatched`);

    // Send result
    res.json(result);
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ 
      error: 'Failed to process CSV file.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

