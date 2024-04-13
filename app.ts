import * as express from 'express';
import * as dotenv from 'dotenv';
import { Request, Response } from 'express';
import axios from 'axios';

dotenv.config();

const app = express();
const port = 3000;

app.get('/memes', async (req: Request, res: Response) => {
    try {
        const response = await axios.get(process.env.MEME_URL);
        const memes = response.data.data.memes;
        res.json(memes);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
