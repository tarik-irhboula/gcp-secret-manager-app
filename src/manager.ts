import path from "path";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

import { logger } from './logger';

type MaybeString = string | null | undefined

export interface Secret {
    name?: MaybeString
    value?: MaybeString
    _fullname?: MaybeString
    _version?: MaybeString
}

export class SecretManager {

    private cache: { [key: string]: Secret } = {};
    private client: SecretManagerServiceClient;
    private project: string;

    constructor(private projectId: string) {
        this.client = new SecretManagerServiceClient();
        this.project = `projects/${projectId}`;
    }

    async listSecrets(): Promise<Array<Secret | null> | null> {
        try {
            const [secrets] = await this.client.listSecrets({ parent: this.project });
            return Promise.all(secrets.map(async secret => secret.name ? this.fetchSecret(secret.name) : null));
        } catch (e) {
            console.error(e);
            logger.error(e.stack);
            return null;
        }
    }

    getSecret(name: string, canonical: boolean = false): Promise<Secret | null> {
        const fullname = canonical ? name : `${this.project}/secrets/${name}`;
        return this.fetchSecret(fullname);
    }

    async createSecret(name: string, value: string): Promise<Secret | null> {
        let secret = {} as any;
        try {
            const [secret] = await this.client.createSecret({
                parent: this.project,
                secretId: name,
                secret: {
                    replication: {
                        automatic: {},
                    },
                }
            });

            const [version] = await this.client.addSecretVersion({
                parent: secret.name,
                payload: {
                    data: Buffer.from(value, "utf8")
                }
            })

            return this.constructSecret(
                name,
                value,
                secret.name,
                version.name
            )
        } catch (e) {
            console.error(e);
            logger.error(e.stack);
            return null;
        }
    }

    async updateSecret(name: string, value: string): Promise<Secret | null> {
        try {
            const secret = await this.getSecret(name);

            const [version] = await this.client.addSecretVersion({
                parent: secret?._fullname,
                payload: {
                    data: Buffer.from(value, "utf8")
                }
            })

            await this.client.disableSecretVersion({
                name: secret?._version
            })

            return this.constructSecret(
                name,
                value,
                secret?._fullname,
                version.name
            )
        } catch (e) {
            console.error(e);
            logger.error(e.stack);
            return null;
        }
    }

    async deleteSecret(name: string): Promise<boolean> {
        try {
            const secret = await this.getSecret(name);

            await this.client.deleteSecret({ name });

            return true;
        } catch (e) {
            console.error(e);
            logger.error(e.stack);
            return false;
        }
    }

    private async fetchSecret(fullname: string): Promise<Secret | null> {
        if (this.cache[fullname])
            return this.cache[fullname]

        try {
            const secretName = path.basename(fullname);

            const [versions] = await this.client.listSecretVersions({ parent: fullname });
            const enabledVersions = versions.filter(version => version.state === "ENABLED")

            if (enabledVersions.length == 0)
                return { name: secretName, _fullname: fullname };

            const [lastVersion] = await this.client.accessSecretVersion({ name: enabledVersions[0].name });

            return this.constructSecret(
                secretName,
                (lastVersion.payload?.data as Buffer).toString("utf8"),
                fullname,
                lastVersion.name
            )
        } catch (e) {
            console.error(e);
            logger.error(e.stack);
            return null;
        }
    }

    private constructSecret(name: MaybeString, value: MaybeString, fullname: MaybeString, version: MaybeString) {
        const secret = {} as any;
        if (name) secret.name = name;
        if (value) secret.value = value;
        if (fullname) secret._fullname = fullname;
        if (version) secret._version = version;

        this.cache[fullname as string] = secret;
        return secret;
    }
}