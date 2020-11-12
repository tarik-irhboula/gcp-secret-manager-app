import fs from "fs";
import path from "path";

const logPath = process.env.ACCESS_LOG || "/var/log/secret-manager/"
if (!fs.existsSync(logPath)){
    fs.mkdirSync(logPath);
}

export const accessLogStream = fs.createWriteStream(path.join(logPath, 'access.log'), { flags: 'a' })
const errorLogStream = fs.createWriteStream(path.join(logPath, 'error.log'), { flags: 'a' })

export const logger = {
  error: (msg: string) => {
    errorLogStream.write(new Date().toISOString() + "\n" + msg + "\n");
  }
}