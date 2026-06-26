const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

app.use(express.json());

const { exec, spawn } = require("child_process");
const progressClients = [];

app.post("/metadata", (req, res) => {

    console.log("METADATA ROUTE HIT");

    const url = req.body.url;

    console.log("URL RECEIVED:", url);

    console.log("STARTING YT-DLP");

     
        exec(
    `python -m yt_dlp --no-playlist -J "${url}"`,
        (error, stdout, stderr) => {

            console.log("YT-DLP FINISHED");

            if (error) {
                console.log(error);
                return res.status(500).json({
                    error: error.message
                });
            }

            console.log("JSON PARSE START");

            const videoData = JSON.parse(stdout);

            console.log("JSON PARSE DONE");

const formats = videoData.formats
.filter(f => f.ext === "mp4" || f.ext === "m4a")
.map(f => ({
    id: f.format_id,
    ext: f.ext,
    resolution: f.resolution,
    hasVideo: f.vcodec !== "none",
    hasAudio: f.acodec !== "none"
}));

console.table(formats);

res.json({
    title: videoData.title,
    channel: videoData.channel,
    thumbnail: videoData.thumbnail,
    duration: videoData.duration,
    views: videoData.view_count,
    uploadDate: videoData.upload_date,
    formats: formats
});
        }
    )
});

app.post("/download", (req, res) => {

    const url = req.body.url;
    const formatId = req.body.formatId;
    const hasVideo = req.body.hasVideo;
    const hasAudio = req.body.hasAudio;

    let formatCommand = formatId;

    if (hasVideo && !hasAudio) {
        formatCommand = `${formatId}+bestaudio`;
    }

    console.log("URL:", url);
    console.log("Downloading with:", formatCommand);

    const child = spawn("python", [
        "-m",
        "yt_dlp",
        "--no-playlist",
        "-f",
        formatCommand,
        "-o",
        "downloads/%(title)s.%(ext)s",
        url
    ]);

    child.stdout.on("data", (data) => {

        const output = data.toString();

        console.log(output);

        const match = output.match(/(\d+(?:\.\d+)?)%/);

        if (match) {

    const percent = match[1];

    console.log("Progress:", percent + "%");

    progressClients.forEach(client => {

        client.write(
            `data: ${JSON.stringify({
                percent: percent
            })}\n\n`
        );

    });

}

    });

    child.stderr.on("data", (data) => {
        console.log(data.toString());
    });

    child.on("close", (code) => {

        console.log("Finished:", code);

        if (code === 0) {

            res.json({
                success: true,
                message: "Download completed"
            });

        } else {

            res.status(500).json({
                success: false,
                message: "Download failed"
            });

        }

    });

});

app.get("/progress", (req, res) => {

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders();

    progressClients.push(res);

    console.log("Client connected");

    req.on("close", () => {

        const index = progressClients.indexOf(res);

        if (index !== -1) {
            progressClients.splice(index, 1);
        }

        console.log("Client disconnected");

    });

});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});