import { translate, type SourceLanguage, type TargetLanguage } from "deeplx";

interface trxTranslate {
    text: string,
    sourceLang: string,
    targetLang: string,
}

export const deepLxServices = {

    async translateText({ text, sourceLang, targetLang }: trxTranslate): Promise<string> {
        return await translate(
            text,
            targetLang as TargetLanguage,
            sourceLang as SourceLanguage,
        );
    }

}
