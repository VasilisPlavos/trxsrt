import { translate, type SourceLanguage, type TargetLanguage } from "deeplx";

interface trxTranslate {
    text: string,
    sourceLang: SourceLanguage,
    targetLang: TargetLanguage,
}

export const deepLxServices = {

    async translateText({ text, sourceLang, targetLang }: trxTranslate): Promise<string> {
        return await translate(text, targetLang, sourceLang);
    }

}
