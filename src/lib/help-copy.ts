import type { Locale } from "@/lib/i18n/locales"
import { marketplacePolicy } from "@/lib/marketplace-policy"

type HelpSection = { id: string; title: string; steps: readonly string[] }
type HelpCopy = { title: string; intro: string; sections: readonly HelpSection[]; contact: string; contactBody: string }
const days = marketplacePolicy.listing.lifetimeDays
const photos = marketplacePolicy.photos.maxCount

/** User help follows the same policy and country/location rules as the product. */
export const helpCopy: Record<Locale, HelpCopy> = {
  en: {
    title: "How can we help?",
    intro: "Find the next step for buying, posting, messages, account access, and privacy.",
    contact: "Contact support",
    contactBody: "For a listing problem, use Report on that listing. For account or technical problems, open Contact. Include what happened and avoid sending passwords, verification codes, or identity documents.",
    sections: [
      { id: "selling", title: "Post and manage an ad", steps: [
        "Post in four steps: Category → Type → Details → Review. Choosing a category opens Type immediately. Back keeps your answers.",
        "A new ad uses your Settings or onboarding country and city. When signed in, the saved profile is the default on every device. A location-specific Post link overrides it for that ad. Drafts and edits keep their saved location.",
        "Choose a city and add a neighborhood, landmark, pickup point, or address. Towns outside the suggestions are accepted without a map pin.",
        `Add up to ${photos} JPEG, PNG, or WebP photos, up to 12 MB each before processing. Photos are resized and GPS metadata is removed before storage. The first photo is the cover.`,
        "Messenger is available without publishing a phone number. Enable phone contact for Call and Text, or enable WhatsApp, only when those methods are wanted.",
        `Review the title, country, local price, location, and contact choices before publishing. Ads expire after ${days} days. Use My ads to edit, pause, mark sold, or renew. Sold, paused, and expired ads do not accept new inquiries.`,
      ] },
      { id: "prices", title: "Countries and prices", steps: [
        "Browsing starts in your saved default country. Selecting another country changes the market and, with Follow selected country enabled, its displayed currency. Uganda uses Ugandan shillings (UGX).",
        "New ads use a currency supported by the country where they are posted. Prices use whole currency units. Changing the browsing country never rewrites a seller’s posted amount or currency.",
        "Each listing shows one price. Converted prices use ≈ because exchange rates are estimates. An explicit currency choice overrides the country rule. If exchange rates are unavailable, the posted price and currency remain visible.",
      ] },
      { id: "location", title: "Location and distance", steps: [
        "Specific-location text and any coordinates chosen for an ad are public in its details. Use a pickup point instead of a private home address when appropriate. Use location only while at the intended pickup point.",
        "Distance appears in listing details. It is an approximate straight-line distance from your saved city, not driving distance or travel time. Unknown towns have no invented coordinates or distance. Location permission is optional; enter the location text if it is denied.",
      ] },
      { id: "buying", title: "Buy safely", steps: [
        "Read the details, ask specific questions, inspect the item, and verify important documents before paying. Sample ads demonstrate the product and are not seller offers.",
        "Message seller opens the composer in the contact panel. Sign in to send messages, save listings, report problems, or use seller phone contact. Sign-in preserves the listing you were viewing.",
        "Messenger keeps each conversation attached to its listing. Use Messages to read and reply. Call, Text, and WhatsApp open their respective apps; those conversations are outside marketplace Messenger.",
        "Stop if someone asks for passwords, verification codes, banking credentials, an unexpected fee, or an urgent payment through a suspicious link. Report suspicious listings. For immediate danger, contact local emergency services.",
      ] },
      { id: "account", title: "Account and privacy", steps: [
        "Use Settings to update your default country, city, language, currency, and profile. Private account information and protected actions require sign-in and the appropriate permission.",
        "Accounts require an 18+ attestation and acceptance of the current Terms and Privacy acknowledgment. If a policy changes, complete the account acceptance prompt to regain protected access.",
        "Use Privacy choices or Privacy requests to review choices and request access, correction, deletion, or other applicable rights. Settings also provides a data export and account deletion. Use moderation history to review a decision and submit an appeal.",
      ] },
      { id: "recovery", title: "Recover from a problem", steps: [
        "If a message fails, keep the draft and retry. Wait for the sending state to finish before sending again. The inbox distinguishes unread incoming messages from your own replies.",
        "If location permission is denied or city suggestions are unavailable, enter the city and a specific pickup description. A saved coordinate remains attached to a draft until the city or country changes.",
        "If a photo cannot be prepared, use another JPEG, PNG, or WebP image. If device storage is full, a draft may save without photos; add them again before publishing. Drafts expire after seven days.",
      ] },
    ],
  },
  fr: {
    title: "Comment pouvons-nous vous aider ?",
    intro: "Trouvez la prochaine étape pour acheter, publier, envoyer des messages, gérer le compte et la confidentialité.",
    contact: "Contacter l’assistance",
    contactBody: "Pour un problème d’annonce, utilisez Signaler sur cette annonce. Pour un problème de compte ou technique, ouvrez Contact. Décrivez le problème sans envoyer de mot de passe, de code de vérification ou de document d’identité.",
    sections: [
      { id: "selling", title: "Publier et gérer une annonce", steps: [
        "Publiez en quatre étapes : Catégorie → Type → Détails → Vérification. Choisir une catégorie ouvre immédiatement Type. Retour conserve les réponses.",
        "Une nouvelle annonce utilise le pays et la ville des paramètres ou de l’inscription. Connecté, le profil enregistré est la valeur par défaut sur chaque appareil. Un lien Publier lié à un lieu la remplace pour cette annonce. Les brouillons et modifications conservent leur lieu.",
        "Choisissez une ville et indiquez un quartier, un point de repère, un lieu de retrait ou une adresse. Les villes absentes des suggestions sont acceptées sans repère sur la carte.",
        `Ajoutez jusqu’à ${photos} photos JPEG, PNG ou WebP, de 12 Mo maximum avant traitement. Les images sont redimensionnées et les métadonnées GPS supprimées avant stockage. La première photo est la couverture.`,
        "Messenger fonctionne sans publier un numéro. Activez le contact téléphonique pour Appeler et SMS, ou WhatsApp, seulement si ces moyens sont souhaités.",
        `Vérifiez le titre, le pays, le prix local, le lieu et les contacts avant publication. Les annonces expirent après ${days} jours. Mes annonces permet de modifier, suspendre, marquer vendu ou renouveler. Les annonces vendues, suspendues ou expirées n’acceptent pas de nouvelles demandes.`,
      ] },
      { id: "prices", title: "Pays et prix", steps: [
        "La navigation commence dans le pays enregistré. Choisir un autre pays change le marché et sa devise lorsque Suivre le pays sélectionné est activé. L’Ouganda utilise le shilling ougandais (UGX).",
        "Une nouvelle annonce utilise une devise acceptée dans son pays. Les prix sont exprimés en unités entières. Changer de pays de navigation ne réécrit jamais le montant ou la devise du vendeur.",
        "Chaque annonce affiche un seul prix. ≈ indique une conversion estimative. Un choix explicite de devise remplace la règle du pays. Sans taux de change disponibles, le prix et la devise d’origine restent visibles.",
      ] },
      { id: "location", title: "Lieu et distance", steps: [
        "Le lieu précis et les coordonnées choisis sont publics dans les détails. Utilisez un lieu de retrait plutôt qu’une adresse privée si nécessaire. Utilisez la localisation seulement au lieu de retrait prévu.",
        "La distance apparaît dans les détails. Elle est approximative, à vol d’oiseau depuis votre ville enregistrée : ce n’est ni une distance routière ni un temps de trajet. Aucun repère ou distance n’est inventé pour les villes inconnues. La permission de localisation est facultative ; saisissez le lieu si elle est refusée.",
      ] },
      { id: "buying", title: "Acheter en sécurité", steps: [
        "Lisez les détails, posez des questions précises, inspectez l’article et vérifiez les documents avant de payer. Les annonces exemples présentent le produit et ne sont pas des offres de vendeurs.",
        "Contacter le vendeur ouvre la rédaction dans le panneau de contact. Connectez-vous pour envoyer, enregistrer, signaler ou utiliser un contact téléphonique. La connexion conserve l’annonce consultée.",
        "Messenger rattache chaque conversation à son annonce. Messages permet de lire et répondre. Appeler, SMS et WhatsApp ouvrent leurs applications ; ces échanges sont externes à Messenger.",
        "Arrêtez si quelqu’un demande un mot de passe, un code, des coordonnées bancaires, des frais inattendus ou un paiement urgent via un lien suspect. Signalez les annonces suspectes. En cas de danger immédiat, contactez les secours locaux.",
      ] },
      { id: "account", title: "Compte et confidentialité", steps: [
        "Les paramètres permettent de modifier pays, ville, langue, devise et profil. Les informations privées et actions protégées exigent une connexion et la permission requise.",
        "Le compte exige une attestation de majorité (18 ans), l’acceptation des Conditions et la prise de connaissance de la Confidentialité. En cas de mise à jour, complétez l’acceptation pour retrouver les fonctions protégées.",
        "Choix de confidentialité et Demandes de confidentialité permettent de demander accès, rectification, suppression et autres droits applicables. Les paramètres offrent l’export et la suppression du compte. L’historique de modération permet d’examiner une décision et de faire appel.",
      ] },
      { id: "recovery", title: "Résoudre un problème", steps: [
        "Si un message échoue, conservez le brouillon et réessayez. Attendez la fin de l’envoi avant de recommencer. La boîte distingue les messages entrants non lus de vos réponses.",
        "Si la localisation est refusée ou les suggestions indisponibles, saisissez la ville et un lieu de retrait précis. Un repère enregistré reste dans le brouillon jusqu’au changement de ville ou de pays.",
        "Si une photo échoue, utilisez une autre image JPEG, PNG ou WebP. Si le stockage de l’appareil est plein, le brouillon peut être enregistré sans photos ; ajoutez-les avant publication. Les brouillons expirent après sept jours.",
      ] },
    ],
  },
  sw: {
    title: "Tunawezaje kusaidia?",
    intro: "Pata hatua inayofuata ya kununua, kutangaza, kutuma ujumbe, kutumia akaunti na kudhibiti faragha.",
    contact: "Wasiliana na usaidizi",
    contactBody: "Kwa tatizo la tangazo, tumia Ripoti kwenye tangazo hilo. Kwa tatizo la akaunti au kiufundi, fungua Mawasiliano. Eleza kilichotokea bila kutuma nenosiri, misimbo ya uthibitisho au hati za utambulisho.",
    sections: [
      { id: "selling", title: "Chapisha na simamia tangazo", steps: [
        "Chapisha kwa hatua nne: Kategoria → Aina → Maelezo → Hakiki. Kuchagua kategoria hufungua Aina mara moja. Kurudi nyuma huhifadhi majibu.",
        "Tangazo jipya hutumia nchi na mji ulioweka kwenye Mipangilio au wakati wa kujiunga. Ukiingia, wasifu uliohifadhiwa hutumika kwenye kila kifaa. Kiungo cha kutangaza eneo fulani hubadilisha eneo kwa tangazo hilo. Rasimu na mabadiliko huhifadhi eneo lao.",
        "Chagua mji na ongeza mtaa, alama inayojulikana, mahali pa kuchukua bidhaa au anwani. Miji isiyo kwenye mapendekezo inakubaliwa bila alama ya ramani.",
        `Ongeza hadi picha ${photos} za JPEG, PNG au WebP, kila moja isizidi MB 12 kabla ya kuchakatwa. Picha hupunguzwa na taarifa za GPS huondolewa kabla ya kuhifadhiwa. Picha ya kwanza ni jalada.`,
        "Messenger hutumika bila kuchapisha nambari ya simu. Washa simu kwa kupigiwa na SMS, au WhatsApp, ikiwa unataka mawasiliano hayo.",
        `Hakiki kichwa, nchi, bei ya hapa, eneo na mawasiliano kabla ya kuchapisha. Matangazo huisha baada ya siku ${days}. Matangazo yangu hukuruhusu kuhariri, kusitisha, kuonyesha imeuzwa au kuhuisha. Tangazo lililouzwa, lililositishwa au lililoisha halipokei maswali mapya.`,
      ] },
      { id: "prices", title: "Nchi na bei", steps: [
        "Kuvinjari huanza katika nchi yako chaguomsingi. Kuchagua nchi nyingine hubadilisha soko na sarafu ikiwa Fuata nchi iliyochaguliwa imewashwa. Uganda hutumia shilingi za Uganda (UGX).",
        "Tangazo jipya hutumia sarafu inayokubalika katika nchi linapochapishwa. Bei hutumia vitengo kamili vya sarafu. Kubadilisha nchi ya kuvinjari hakubadilishi kiasi au sarafu aliyotangaza muuzaji.",
        "Kila tangazo linaonyesha bei moja. ≈ huonyesha ubadilishaji wa makadirio. Sarafu uliyochagua mwenyewe hutangulia sheria ya nchi. Viwango vikikosekana, bei na sarafu ya awali huendelea kuonekana.",
      ] },
      { id: "location", title: "Mahali na umbali", steps: [
        "Maelezo ya mahali na viwianishi unavyochagua vinaonekana hadharani kwenye maelezo. Tumia mahali pa kuchukua bidhaa badala ya anwani binafsi inapofaa. Tumia mahali ulipo ikiwa upo sehemu iliyokusudiwa ya kuchukua bidhaa.",
        "Umbali huonekana kwenye maelezo ya tangazo. Ni makadirio ya mstari ulionyooka kutoka mji uliohifadhiwa, si umbali wa barabarani au muda wa safari. Miji isiyojulikana haipewi viwianishi au umbali wa kubuni. Ruhusa ya mahali si lazima; andika eneo ikiwa imekataliwa.",
      ] },
      { id: "buying", title: "Nunua kwa usalama", steps: [
        "Soma maelezo, uliza maswali maalumu, kagua bidhaa na thibitisha hati muhimu kabla ya kulipa. Matangazo ya mfano huonyesha bidhaa ya tovuti; si ofa za wauzaji.",
        "Tuma ujumbe kwa muuzaji hufungua sehemu ya kuandika kwenye paneli ya mawasiliano. Ingia ili kutuma, kuhifadhi, kuripoti au kutumia simu ya muuzaji. Kuingia huhifadhi tangazo ulilokuwa ukitazama.",
        "Messenger huunganisha kila mazungumzo na tangazo lake. Tumia Ujumbe kusoma na kujibu. Kupiga simu, SMS na WhatsApp hufungua programu zake; mazungumzo hayo yako nje ya Messenger.",
        "Sitisha ikiwa mtu anaomba nenosiri, msimbo, taarifa za benki, ada isiyotarajiwa au malipo ya haraka kupitia kiungo cha kutia shaka. Ripoti matangazo ya kutia shaka. Ukiwa katika hatari ya haraka, wasiliana na huduma za dharura za eneo lako.",
      ] },
      { id: "account", title: "Akaunti na faragha", steps: [
        "Tumia Mipangilio kubadilisha nchi, mji, lugha, sarafu na wasifu. Taarifa binafsi na vitendo vinavyolindwa huhitaji kuingia na ruhusa inayofaa.",
        "Akaunti inahitaji uthibitisho wa umri wa miaka 18 au zaidi, kukubali Masharti na kutambua Sera ya Faragha. Sera ikibadilika, kamilisha ombi la kukubali ili kurudia matumizi yanayolindwa.",
        "Tumia Chaguo za Faragha au Maombi ya Faragha kuomba ufikiaji, marekebisho, kufuta na haki nyingine zinazotumika. Mipangilio ina kutoa nakala ya data na kufuta akaunti. Historia ya usimamizi hukuruhusu kukagua uamuzi na kukata rufaa.",
      ] },
      { id: "recovery", title: "Rekebisha tatizo", steps: [
        "Ujumbe ukishindwa, hifadhi rasimu na ujaribu tena. Subiri utumaji umalizike kabla ya kutuma tena. Kikasha hutofautisha ujumbe unaoingia ambao haujasomwa na majibu yako.",
        "Ruhusa ya mahali ikikataliwa au mapendekezo yakikosekana, andika mji na maelezo maalumu ya kuchukua bidhaa. Viwianishi vilivyohifadhiwa hubaki kwenye rasimu mpaka mji au nchi ibadilishwe.",
        "Picha ikishindwa, tumia JPEG, PNG au WebP nyingine. Hifadhi ya kifaa ikijaa, rasimu inaweza kuhifadhiwa bila picha; ziongeze kabla ya kuchapisha. Rasimu huisha baada ya siku saba.",
      ] },
    ],
  },
}
