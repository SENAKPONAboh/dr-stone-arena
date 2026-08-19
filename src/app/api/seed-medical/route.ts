import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const curriculum = [
      {
        year: 1,
        title: "Première Année (EM1)",
        subjects: [
          {
            name: "Physiologie",
            chapters: [
              "MP",
              "CH",
              "EAB",
              "Comportement dipsique",
              "Lymphe et sa circulation",
              "Immunité",
              "Thymus",
              "Bioénergétique",
              "Métabolisme de base",
              "Les apports alimentaires",
              "Les vitamines"
            ]
          },
          {
            name: "Histologie",
            chapters: [
              "Introduction",
              "ERU",
              "ERP",
              "EG Endocrine",
              "EG Exocrine",
              "T Conjonctif",
              "T Reticuleux & T Adipeux",
              "Tissu cartilagineux",
              "Tissu osseux"
            ]
          },
          {
            name: "Embryologie Générale",
            chapters: [
              "Gametogenèse",
              "Fécondation",
              "1ère semaine de développement embryonnaire",
              "Seconde semaine",
              "3ème semaine"
            ]
          },
          {
            name: "Chimie",
            chapters: [
              "Atomistique"
            ]
          },
          {
            name: "Biochimie",
            chapters: [
              "Introduction",
              "Les glucides",
              "Les protides(a aminés et peptides)",
              "Les protéines",
              "Les lipides",
              "Les acides nucléiques"
            ]
          },
          {
            name: "Physique",
            chapters: [
              "Cinématique",
              "Dynamique du point matériel",
              "Hydrodynamique",
              "Phénomènes de surface",
              "Mouvements vibratoires",
              "Ondes sonores",
              "Diffusion",
              "Thermodynamique"
            ]
          },
          {
            name: "Biophysique",
            chapters: [
              "Eau",
              "Solutions",
              "Déplacements moléculaires dans les solutions",
              "Transferts passifs membranaires",
              "Pression osmotique & Ultra filtration"
            ]
          },
          {
            name: "Anatomie",
            chapters: [
              "Notions de bases en anatomie",
              "Système squelettique",
              "Système articulaire",
              "Système cardiovasculaire",
              "Ostéologie du membre supérieur",
              "Arthrologie du membre supérieur",
              "Myologie du membre supérieur",
              "Artères du membre supérieur",
              "Veines du membre supérieur",
              "Plexus brachial",
              "Région de la fosse axillaire",
              "Ostéologie du membre pelvien",
              "Articulation coxo fémorale",
              "Articulation du genou",
              "Articulation de la cheville",
              "Myologie du bassin",
              "Myologie de la cuisse",
              "Myologie de la jambe et du pied",
              "Vascularisation du membre pelvien",
              "Plexus lombaire",
              "Plexus lombo-sacré",
              "Le trigone femoral",
              "Ostéologie de la tête",
              "Le système tégumentaire",
              "Organes de sens",
              "Le rachis ou colonne vertébrale",
              "Fosse poplitée",
              "Myologie du cou",
              "Les vaisseaux du cou",
              "Pharynx",
              "Larynx",
              "Region supraclaviculaire",
              "Region bicarotidienne",
              "Parotide"
            ]
          },
          {
            name: "Biologie cellulaire",
            chapters: [
              "Introduction à la biologie cellulaire",
              "Membrane plasmique",
              "Système endomembrannaire",
              "La mitochondrie",
              "Peroxysomes",
              "Noyau cellulaire",
              "Cytosquelette",
              "croissance et division cellulaire",
              "Matrice extra cellulaire",
              "Signalisation cellulaire"
            ]
          },
          {
            name: "Génétique",
            chapters: [
              "Notions de base en génétique",
              "Réplication d'ADN",
              "Protéosynthèse et protéolyse",
              "Alterations de l'ADN",
              "Anomalies chromosomiques",
              "Cytogénétique constitutionnelle et moléculaire"
            ]
          },
          {
            name: "Biostatistique",
            chapters: [
              "Les variables statistiques",
              "Les paramètres statistiques",
              "Mesure des fréquences"
            ]
          },
          {
            name: "Anglais médical",
            chapters: [
              "Grammar",
              "Medical English"
            ]
          },
          {
            name: "Informatique médical",
            chapters: [
              "Introduction à l'informatique",
              "Initiation à Word",
              "Excel",
              "Power Point"
            ]
          },
          {
            name: "Mathématiques",
            chapters: [
              "Dénombrements",
              "Probabilités",
              "Les statistiques"
            ]
          }
        ]
      },
      {
        year: 2,
        title: "Deuxième Année (EM2)",
        subjects: [
          {
            name: "Physiologie",
            chapters: [
              "Le sang",
              "Hémostase",
              "Groupe sanguin",
              "Automatisme cardiaque",
              "Hémodynamique intracardiaque",
              "Débit cardiaque",
              "Pression artérielle",
              "Filtration glomerulaire",
              "Fonction tubulaire",
              "Concentration-Dilution urinaire",
              "Clairance",
              "Miction",
              "Thermorégulation",
              "Mécanique ventilatoire",
              "Échange alvéolo-capillaire",
              "Transport des gaz par le sang",
              "Régulation respiratoire",
              "Organisation du système nerveux",
              "Physiologie du neurone",
              "Synapse",
              "Somesthésie",
              "Physiologie de la douleur",
              "Motricité réflexe",
              "Le Cervelet",
              "Fonction supérieure",
              "Sommeil",
              "Système nerveux végétatif",
              "Liquide cérébrospinal",
              "Œil",
              "Audition",
              "Organisation du système hormonale",
              "Axe hypotalamus-hypophyse",
              "Hormone Thyroïdienne",
              "Réponse endocrine au stress",
              "Reproduction masculine",
              "Reproduction féminine",
              "Pancréas andocrine"
            ]
          },
          {
            name: "Anatomie",
            chapters: [
              "Topographie de l'abdomen",
              "Paroi de l'abdomen",
              "Œsophage",
              "Estomac",
              "Duodenum-pancréa",
              "Rate",
              "Foie et voie biliaire",
              "Jéjuno-ilium",
              "Colon",
              "Topographie du pelvis",
              "Paroi Pelvis et Périnée",
              "Région rétropéritonéale",
              "Urètre pelvien chez la femme",
              "Vessie",
              "Rectum",
              "Scrotum",
              "Testicule",
              "Voies spermatiques",
              "Prostate",
              "Penis",
              "Utérus et annexe de l'utérus",
              "Appareil génitaux externe de la femme",
              "Vagin",
              "Ostéologie de la tête",
              "Introduction à la neuroanatomie",
              "La moelle spinale",
              "Tronc cérébrale",
              "Cervelet",
              "Cerveau",
              "Méninges",
              "Vascularisation",
              "Voie de la sensibilité",
              "Voie optique",
              "Généralité sur les nerfs crânienne",
              "Les Voies de la motricité",
              "Les nerfs moteurs de l'œil",
              "Les nerfs facials",
              "Système nerveux autonome",
              "Les nerfs crâniennes",
              "Topographie du Thorax",
              "Glande mammaires",
              "Le cœur (Tissu Nodal)",
              "L'aorte",
              "Système cave- système azygos",
              "Trachée",
              "Bronche",
              "Poumon",
              "Diaphragme",
              "Pédicule pulmonaire"
            ]
          },
          {
            name: "Embryologie",
            chapters: [
              "Appareil respiratoire",
              "Appareil digestif",
              "Appareil urogénital",
              "Appareil cardio-vasculaire",
              "Système nerveux",
              "Système endocrinien",
              "Tête et cou",
              "Les Membres",
              "Organe de sens",
              "Système tégumentaire"
            ]
          },
          {
            name: "Histologie",
            chapters: [
              "L'appareil digestif",
              "Tube digestif",
              "Glandes annexes au système digestif",
              "Appareil génital féminin",
              "Appareil génital masculin",
              "Appareil urinaire",
              "Appareil respiratoire",
              "Appareil cardio-vasculaire",
              "Système tégumentaire"
            ]
          },
          {
            name: "Anglais",
            chapters: [
              "Medical English"
            ]
          },
          {
            name: "Psychologie",
            chapters: [
              "Psychologie médicale"
            ]
          },
          {
            name: "Biophysique",
            chapters: [
              "Rayonnement par émission d'un électron",
              "Rayonnement par émission d'un noyau",
              "Interaction entre le Rayonnement et la matière",
              "Détection et mesure",
              "Imagerie dans la médecine nucléaire",
              "Imagerie radiologique",
              "Imagerie par raisonnance magnétique",
              "Dosimétrie",
              "Échographie",
              "Radioprotection",
              "Radiothérapie",
              "Radiobiologie"
            ]
          },
          {
            name: "Biochimie",
            chapters: [
              "Introduction à la Biochimie métabolique",
              "Le métabolisme",
              "Activité et cinétique enzymatique",
              "Introduction à la glycogénolyse",
              "Métabolisme de la glycogénèse",
              "Métabolisme de la néoglucogénèse",
              "Métabolisme général des lipides",
              "Protéosynthèse et prothéolyse",
              "Métabolisme des Acide aminé",
              "Métabolisme des cathécolamine",
              "Voie des pentoses",
              "Métabolisme du cholestérol",
              "Métabolisme des Acide biliaire",
              "Hormone Thyroïdienne",
              "Métabolisme de l'hémoglobine",
              "Métabolisme du fer",
              "Lipolyse et lipogénèse",
              "Cycle de krebs",
              "Chaîne respiratoire mitochondriale"
            ]
          },
          {
            name: "Éthique et Déontologie",
            chapters: [
              "Éthique et déontologie médicale"
            ]
          },
          {
            name: "Soins infirmiers",
            chapters: [
              "Hygiène hospitalière",
              "Hygiène des mains",
              "Port des gants",
              "A.E.S",
              "Température",
              "Pulsation",
              "Tension artériel",
              "Respiration",
              "Injection",
              "Perfusion",
              "Transfusion",
              "Ponction ascite",
              "Ponction lombaire",
              "Ponction veineuse",
              "Cathéterisme vésicale",
              "Soins de plaie",
              "Pansement",
              "Bandage"
            ]
          }
        ]
      },
      {
        year: 3,
        title: "Troisième Année (EM3)",
        subjects: [
          {
            name: "Immunologie",
            chapters: [
              "Introduction à l'immunologie",
              "Organes et tissus du système immunitaire",
              "L'immunité innée",
              "Les antigènes",
              "Les anticorps",
              "Réactions antigènes -anticorps",
              "Complexe majeur d'histocompatibilité(CMH)",
              "Système du complément",
              "Les réactions d'hypersensibilité",
              "Vaccins(mécanisme d'action)",
              "Interactions cellulaires"
            ]
          },
          {
            name: "Sémiologie médicale pneumologique",
            chapters: [
              "Interrogatoire en pneumologie",
              "Toux chez un adulte",
              "Expectorations",
              "Hémoptysie",
              "Douleur thoracique",
              "Dyspnée",
              "Examens physiques en pathologie respiratoire",
              "Les grands syndromes cliniques en pneumologie",
              "Examens complémentaires en pneumologie"
            ]
          },
          {
            name: "Sémiologie médicale endocrinologique",
            chapters: [
              "Sémiologie de l'axe hypothalamo-hypophysaire",
              "Sémiologie gonadique",
              "Sémiologie surrénalienne",
              "Sémiologie thyroïdienne",
              "Sémiologie parathyroïdienne",
              "La semiologie du pancréas endocrine(diabète sucré)"
            ]
          },
          {
            name: "Sémiologie radiologique",
            chapters: [
              "La sémiologie ostéo-articulaire",
              "Les infections ostéo-articulaire",
              "Les rhumatismes osseux",
              "Tumeurs osseuses",
              "Les maladies osseuses métabolique chez l'enfant",
              "Les ostéopathies endocrines",
              "Le cliché d'abdomen sans préparation (ASP)",
              "Les images pathologiques gastro duodénales(transit œso-gastro-duodénal:TOGD)",
              "Sémiologie du grêle et du côlon",
              "Techniques d'exploration radiographique du thorax",
              "Radio-anatomie du thorax",
              "Les Syndromes radiographique du thorax",
              "Les Syndromes de comblement alvéolaire",
              "Le Syndromes interstitiel",
              "Le Syndromes Bronchique",
              "Le Syndromes pleural",
              "Le Syndrome mediastinal",
              "Le Syndrome cavitaire",
              "Exploration radiographique de l'appareil urinaire",
              "Hystero Salpingo Graphie (HSG)",
              "La mammographie"
            ]
          },
          {
            name: "Sémiologie médicale cardiologique",
            chapters: [
              "Douleur thoracique",
              "Syndrome PÉRICARDIQUE",
              "Électrocardiogramme",
              "Palpitations",
              "Dyspnée",
              "La sémiologie cardiaque",
              "Sémiologie de l'hypertension artérielle",
              "Sémiologie de l'insuffisance cardiaque",
              "Syncope, perte de connaissances ,lipothymie",
              "Insuffisance coronaire"
            ]
          },
          {
            name: "Sémiologie rhumatologique",
            chapters: [
              "Plan d'observation médicale en rhumatologie"
            ]
          },
          {
            name: "Sémiologie hématologie",
            chapters: [
              "Éléments figurés du sang",
              "Hemostase",
              "La Vitesse de sédimentation (VS)",
              "Électrophorèse des protéines",
              "Test d'Emmel"
            ]
          },
          {
            name: "Génétique",
            chapters: [
              "Bases de la génétique",
              "Mécanisme et classification des maladies génétiques",
              "Les anomalies chromosomiques"
            ]
          },
          {
            name: "Sémiologie médicale néphrologique",
            chapters: [
              "Rappels anatomiques et physiologiques sur le rein",
              "Explorations fonctionnelles rénale",
              "Imagerie en néphrologie",
              "Les déshydratation et hyper-hydratation extracellulaire",
              "Les dysnatremies(hyponatremie et hypernatremie)",
              "Les dyskaliémies (Hypokaliemie et hyperkaliémie.)",
              "L'équilibre acido-basique",
              "Les grands Syndromes Néphrologiques"
            ]
          },
          {
            name: "Bacterio-virologie",
            chapters: [
              "BG1:DÉFINITION ET CLASSIFICATION ET NOMENCLATURE DES BACTÉRIES",
              "BG2:MORPHOLOGIE ET STRUCTURE DES BACTÉRIES",
              "BG3:NUTRITION PHYSIOLOGIE ET CROISSANCE DES BACTÉRIES",
              "BG4:GÉNÉTIQUE BACTÉRIENNE",
              "BG5 :ANTIBIOTIQUES",
              "BG6 RÉSISTANCES BACTÉRIENNE AUX ANTIBIOTIQUES",
              "BS1 :STAPHYLOCOCUS",
              "BS2 :STREPTOCOCCUS",
              "BS3 :NEISSERIA SPP.",
              "BS4:ENTEROBACTERIACEAE",
              "BS5:VIBRIONACEAE(VIBRIO CHOLERAE)",
              "BS6:MYOBACTERIES",
              "BS7:SPIROCHETES",
              "BS8:BACTÉRIES INTRA CELLULAIRES",
              "VG1:DÉFINITION, STRUCTURE ET CLASSIFICATION DES VIRUS",
              "VG2: MULTIPLICATION Virale",
              "VG3 :INFECTIONS VIRALES HUMAINES",
              "VG4:MÉTHODES DE DIAGNOSTIC EN VIROLOGIE",
              "VS1 : HERPESVIRIDAE",
              "VS2 ADENOVIRIDAE",
              "VS3 :PAPILLOMAVIRIDAE",
              "VS4 POLIOVIRUS",
              "VS5 MONKEY-POX VIRUS (MPOX VIRUS)",
              "VS6: VIRUS DE LA FIÈVRE JAUNE",
              "VS7: VIRUS DES HÉPATITES",
              "VS8:CORONAVIRIDAE",
              "VS9:FIÈVRE HÉMORRAGIQUE VIRALES",
              "VS10: RETROVIRIDAE",
              "VS11:VIRUS DE L’EBOLA",
              "VS12: RHABDOVIRIDAE",
              "VS13: ORTHOMYXOVIRUS"
            ]
          },
          {
            name: "Sémiologie neurologique",
            chapters: [
              "Examen neurologique",
              "Sémiologie analytique (Syndrome pyramidal, cérébelleux, neurogène périphérique, méningé, myasthénique, vestibulaire)",
              "Sémiologie topographique"
            ]
          },
          {
            name: "Parasitologie",
            chapters: [
              "Généralités sur la parasitologie",
              "Les amibiases",
              "Le paludisme",
              "Les nematodes(les ascaris ,les filaires lymphatiques)",
              "Téniasis",
              "Candidoses",
              "Les Dermatophytes des phanères"
            ]
          },
          {
            name: "Sémiologie médicale digestive",
            chapters: [
              "Les douleurs abdominales",
              "Les splénomégalie",
              "Les hepatomégalie",
              "Les ascite",
              "Les ictère",
              "Les explorations hepatiquees et Syndromes hepatiques",
              "Les troubles du transit"
            ]
          },
          {
            name: "Anatomie pathologique",
            chapters: [
              "Moyens et objectifs de l'anapath dans la médecine moderne",
              "Lésions élémentaires des cellules, tissus et organes",
              "Le système circulatoire et ses troubles",
              "Réactions inflammatoire et les inflammations",
              "Pathologie tumorale"
            ]
          },
          {
            name: "Sémiologie urologique",
            chapters: [
              "Douleur en urologie",
              "Les modifications de la miction",
              "Les syndromes urinaires"
            ]
          },
          {
            name: "Sémiologie neurochirurgicale",
            chapters: [
              "Hypertension intracrânienne",
              "Hémorragie méningé",
              "Les compressions médullaires lentes",
              "Le syndrome de la queue du cheval",
              "Le syndrome frontal"
            ]
          },
          {
            name: "Sémiologie vasculaire",
            chapters: [
              "Généralités sur la sémiologie vasculaire",
              "Sémiologie artérielle,veineuse et lymphatique",
              "Les syndromes vasculaires"
            ]
          },
          {
            name: "Sémiologie gynécologique",
            chapters: [
              "La consultation en gynécologie",
              "Les démarches diagnostiques en gynécologie obstétrique",
              "Les affections courantes:torsions d'annexes",
              "Les fibromes utérin"
            ]
          },
          {
            name: "Sémiologie chirurgicale digestive",
            chapters: [
              "Abcès chaud-abcès froid",
              "Les panaris et phlegmon",
              "Les gangrène gazeuses",
              "Douleur abdominale",
              "Appendicite aiguë",
              "Les péritonites",
              "Les UGD",
              "Le syndrome occlusif",
              "Le syndrome œsophagien",
              "Le reflux gastro-oesophagien",
              "Sténose hypertrophique du pylore",
              "Les lithiases vésicales et ses complications",
              "Pancréatite aiguë",
              "Hernies et éventrations",
              "Hémorragie digestive",
              "La cirrhose",
              "Hépatomégalie",
              "Les maladies hémorroïdaires",
              "Les ictères"
            ]
          },
          {
            name: "Sémiologie thoracique",
            chapters: [
              "Traumatisme thoracique fermé",
              "Les plaies thoraciques",
              "Les syndromes mediastinaux",
              "Les malformations de la paroi thoracique",
              "Introduction à la chirurgie thoracique"
            ]
          },
          {
            name: "Sémiologie traumatologique",
            chapters: [
              "Sémiologie de l'appareil locomoteur"
            ]
          },
          {
            name: "Pharmacologie",
            chapters: [
              "Introduction à la pharmacologie générale",
              "Development du médicament",
              "Résorption",
              "Distribution",
              "Biotransformation",
              "Cibles biologiques des médicaments- classification",
              "Les canaux,pompes,transporteurs ioniques",
              "Les enzymes et autres protéines",
              "Les récepteurs",
              "Le système cholinergique"
            ]
          }
        ]
      },
      {
        year: 4,
        title: "Quatrième Année (EM4)",
        subjects: [
          {
            name: "Pathologies Respiratoires",
            chapters: [
              "Bronchite Aigue",
              "Pneumopathie aiguë bactérienne",
              "Abcès du poumon",
              "Aspergillome",
              "Pneumonie caséeuse",
              "Pneumopathie à SARS-CoV-2",
              "Amibiase pleuro-pulmonaire",
              "Primo-infection tuberculeuse",
              "Tuberculose pulmonaire commune",
              "Miliaire Tuberculeuse",
              "Coinfection Tuberculose/VIH",
              "Tuberculose Multi-résistante",
              "BPCO",
              "Asthme Bronchique",
              "Pleurésie",
              "Pleurésie purulente",
              "DDB",
              "Opacité Madiastinale",
              "Pneumothorax",
              "Cancers Bronchique primitif",
              "OAPL ( Œdème Aiguë pulmonaire lésionnel)",
              "Sarcoïdose Mediastino-pulmonaire",
              "Insuffisance Respiratoire chronique",
              "CAT devant un Traumatisme grave du Thorax",
              "Drainage Thoracique",
              "Diagnostic d'une Tumeur Médiastinale",
              "Cancer Broncho-Pulmonaire",
              "Pneumothorax spontané",
              "Pyothorax",
              "Embolie pulmonaire"
            ]
          },
          {
            name: "Pathologie Vasculaire",
            chapters: [
              "Pré requis en Chirurgie vasculaire (introduction)",
              "Thromboses Veineuses Profonde (TVP)",
              "AOMI",
              "Ischémie aigue des membres inférieurs",
              "Les anévrismes artériels",
              "Dissection aortique",
              "Fistules arterio-veineuse",
              "Les varices des membres inférieurs"
            ]
          },
          {
            name: "Pathologies cardiovasculaires",
            chapters: [
              "Insuffisance cardiaque",
              "Insuffisance coronaire",
              "Myocardites",
              "Myocardiopathies",
              "Hypertension artérielle",
              "Hypotension artérielle",
              "Troubles du rythme",
              "Troubles de conduction",
              "ECG",
              "SCA",
              "Péricardites",
              "EP",
              "OAP",
              "Rétrécissement Mitral",
              "Insuffisance Mitrale",
              "Endocardites infectieuses"
            ]
          },
          {
            name: "Maladies infectieuses",
            chapters: [
              "Paludisme",
              "Amibiase",
              "Bilharziose",
              "Helminthiases digestives",
              "Salmonellose",
              "Septicémie et choc septique",
              "Shigelloses",
              "Rhumatismes Articulaires aiguë",
              "Méningites",
              "Maladies urinaires",
              "Tétanos",
              "Choléra",
              "Brucellose",
              "Tuberculose extra pulmonaire",
              "Généralités sur les maladies infectieuses",
              "L’infection par le VIH",
              "Les infections opportunistes liées aux VIH",
              "Hépatites virales",
              "Fièvre hémorragique",
              "Rougeole",
              "Rubéole",
              "Oreillon",
              "Poliomyélite aiguë antérieure",
              "Rage",
              "Grippe",
              "Covid-19",
              "Herpes virus",
              "Varicelle"
            ]
          },
          {
            name: "Urgences et Réanimation",
            chapters: [
              "Anesthésie générale",
              "Réanimation du nouveau née",
              "Accident transfusionnel",
              "Les détresses respiratoires",
              "Traumatismes crâniens Graves",
              "Oxygénothérapie",
              "Urgences toxicologiques",
              "Drogues de Réanimation",
              "Scores de Gravité",
              "Les gestes qui sauvent",
              "États de chocs",
              "Brûlures",
              "Complications du diabète"
            ]
          },
          {
            name: "Néphrologie",
            chapters: [
              "IRC",
              "Pathogénies des néphropathies glomerulaires",
              "Glomerulopathies",
              "Néphropathie Diabétique",
              "Néphropathie lié aux VIH/SIDA",
              "Néphropathies tubulaires",
              "Néphropathies interstitielles",
              "Néphropathies vasculaires",
              "Néphropathies héréditaire",
              "IRA"
            ]
          },
          {
            name: "Pathologies urologiques et génitales",
            chapters: [
              "Syndrome de jonction pyélo-urétérale",
              "Mega uretère",
              "Uréterocèle",
              "Les Valves de l’urètre postérieur",
              "Exstrophie vésicale",
              "Infections urinaire basses : cystite",
              "Infections urinaires hautes : pyèlonephrite",
              "Bilharziose urogénitale",
              "Tuberculose urogénitale",
              "Rétrécissement Urétral",
              "Lithiase urinaire",
              "Fistules vésico-vaginales",
              "Lésions urologiques au cours des traumatismes du bassin",
              "Traumatisme du rein",
              "Tumeur de vessie",
              "Cancer de rein",
              "Paraphimosis et Phimosis",
              "Priapisme",
              "Torsion du Cordon spermatique",
              "Traumatisme des OGE masculin",
              "Gangrène de Fournier",
              "Principaux examens en urologie",
              "Hydrocele",
              "Cryptorchidie",
              "Hypospadias",
              "Epispadias",
              "Urétrite",
              "Orchites",
              "Epidymite aigue",
              "Prostatites aiguës",
              "Prostatites chroniques",
              "Hypertrophie bénigne de la prostate (HBP)",
              "Cancer de la prostate",
              "Cancer du testicule"
            ]
          },
          {
            name: "Pathologies Digestives",
            chapters: [
              "Appendicite Aigue",
              "Péritonite Aigue",
              "Pancréatite aiguë",
              "Abcès du foie",
              "Occlusion intestinale aigue",
              "Volvulus du colon pelvien",
              "Traumatismes abdominaux",
              "Éventrations",
              "Les Hernies",
              "Fistules et fissures anales",
              "Maladies hémorroïdaires",
              "Tumeur bénigne du foie",
              "Cancer du pancréas exocrine",
              "Complications de la lithiase vésiculaire : cholécystique aigue lithiasique, lithiase de la voie biliaire principale",
              "Maladies Ulcéreuses Gastro-Duodenale (MUGD)",
              "Hémorragies digestives",
              "Gastrites",
              "Œsophagites",
              "RGO",
              "Ictère",
              "Cirrhose",
              "Hépatites virales",
              "Cancers du foie"
            ]
          },
          {
            name: "Anatomopathologie spéciale",
            chapters: [
              "Pathologies de l’œsophage",
              "Pathologies Gastrique",
              "Pathologies colo-rectale",
              "Pathologies Hépatiques",
              "Pathologies du pancréas",
              "Pathologies tumorales du col de l’utérus",
              "Pathologies tumorales de l’utérus",
              "Pathologies tumorale des ovaires",
              "Pathologie tumorale de la prostate"
            ]
          },
          {
            name: "Hématologie",
            chapters: [
              "Anémie par carence en fer",
              "Anémie par carence en facteur anti-pernicieux (vitB12, Ac folique)",
              "Diagnostic d’une splénomégalie(SMG)",
              "Diagnostic des Adénopathies (ADP)",
              "Transfusions sanguines",
              "Leucémie lymphoïde chronique",
              "Lymphomes",
              "Myélome multiples (maladie de kahler)",
              "Hémophilies",
              "Maladies de Von willebrand",
              "Syndrome de defribination",
              "Déficit en G-6PD",
              "Microspherocytose",
              "Drépanocytose",
              "Les Thalassemies",
              "Leucémie Aigue",
              "Aplasies médullaire",
              "Leucémie myéloïde chronique",
              "Leucémie myélomonocytaire chronique",
              "Thrombocytemie essentielle",
              "Splénomégalie Myéloïde"
            ]
          }
        ]
      },
      {
        year: 5,
        title: "Cinquième Année (EM5)",
        subjects: [
          {
            name: "Gynécologie et Obstétrique",
            chapters: [
              "Diagnostic de la grossesse",
              "Surveillance de la grossesse",
              "Accouchement normal",
              "Suites des couches normales/pathologique",
              "Présentation du sommet",
              "Présentation défléchies",
              "Présentation de la face",
              "Présentation transverse",
              "Grossesse gémellaire",
              "Allo-immunisation sanguine fœuto-maternelle",
              "Examens cliniques et paracliniques en Gynécologie",
              "Obstétrique: symptômes, examens cliniques et explorations au cours de la grossesse",
              "Troubles hypertensive au cours de la grossesse",
              "Eclamsie",
              "Hématome retro placentaire",
              "Présentation de siège",
              "Fibrome utérin",
              "Tumeurs bénignes de l'ovaire",
              "Diabète de la Grossesse",
              "Dystocies mécaniques",
              "Rupture utérine",
              "Placenta prævia",
              "Partogramme",
              "Métrorragies du 1er trimestre de grossesse",
              "Grossesse Extra utérine",
              "Avortement",
              "Maladie trophoblastique de la grossesse",
              "Asphyxie du perpartum",
              "Procidence du cordon",
              "Infections urinaires au cours de la grossesse",
              "Dépassement de terme",
              "Dystocies dynamiques",
              "Aménorrhée primaire",
              "Aménorrhée secondaire",
              "Menace d'accouchement prématurée",
              "Rupture prématuré des membranes",
              "Épisiotomie",
              "Infection génitale haute",
              "Extractions instrumentales",
              "Les utérotoniques",
              "Médicaments et Grossesse",
              "Contraception",
              "Infertilité du Couple",
              "Cancer du col utérin",
              "Ménopause",
              "Cancer du sein",
              "Cancer de l'endomètre"
            ]
          },
          {
            name: "Appareil Locomoteur / Traumatologie / MPR / Rhumatologie",
            chapters: [
              "Généralités sur les fractures des membres",
              "Luxation de l'épaule",
              "Fracture de la Clavicule",
              "Luxation du coude",
              "Fracture de la diaphyse Humérale",
              "Fracture de la palette Humérale",
              "Fracture de la diaphyse des deux os de l'avant bras",
              "Fracture de l'extrémité distale du Radius",
              "La spécialité MPR",
              "Généralités sur la MPR",
              "Moyens d'évaluation en MPR",
              "Moyens et techniques de PEC en MPR",
              "Généralité sur le Handicap",
              "Prescription de la consultation et technique descriptive de l'ordonnance en MPR",
              "Introduction sur la biomécanique humaine",
              "Ostéomyélite",
              "Coxarthrose",
              "Ostéosarcome",
              "Luxation de la Hanche",
              "Fracture du col du fémur",
              "Fracture trochanterienne",
              "Fracture diaphysaire du fémur",
              "Fracture du fémur distale",
              "Fracture des plateaux tibiaux",
              "Luxation du Genou",
              "Fracture ouverte de la Jambe",
              "Fracture du pilon tibiale",
              "Examen médical de base chez un sportif",
              "Premiers soins d'urgence sur un terrain de sport (1ère partie)",
              "Premiers soins d'urgence sur un terrain de sport (2ème partie)",
              "Traumatismes du Genou chez le sportif",
              "Traumatismes de la cheville",
              "Lésions musculaires",
              "L'énergétique des activités physiques",
              "Syndrome du coeur d'athlète",
              "Adaptation cardio respiratoire",
              "Plan d'observation en rhumatologie",
              "Polyarthrite rhumatoïde",
              "Arthrose",
              "Ostéoporose",
              "Arthrite infectieuse",
              "Arthrite microcristalline",
              "Spondylarthrites",
              "Rhumatismes post-infectieux"
            ]
          },
          {
            name: "Endocrinologie",
            chapters: [
              "Hyperthyroïdie",
              "Hypothyroïdie",
              "Insuffisance surrénale",
              "Insuffisance anté-hypophysaire",
              "Diabète Insipide",
              "Adénome hypophysaire",
              "HTA Endocrine",
              "Hyper/Hypoparathyroïdie",
              "Aménorrhée Endocrine",
              "Hypogonadisme Masculin",
              "Généralité sur le diabète",
              "Classification nosologique du Diabète",
              "Complications du Diabète",
              "Traitement du Diabète",
              "Obésité",
              "Dénutrition"
            ]
          },
          {
            name: "Neurochirurgie",
            chapters: [
              "HTIC",
              "Hydrocéphalie du nourrisson",
              "Compression Médullaire",
              "Hernie discale",
              "Généralités sur les traumatismes cranio-encéphalique",
              "Hématome Extra dural",
              "Traumatismes du Rachis Dorsal et Lombaire",
              "Traumatismes du Rachis cervical",
              "Hémorragies méningés"
            ]
          },
          {
            name: "Neurologie",
            chapters: [
              "AVC",
              "Épilepsies",
              "Coma non traumatique",
              "Céphalées",
              "Myasthénie",
              "Polyradiculonévrite aiguë",
              "Syndromes canalaires",
              "TD (Correction des cas cliniques)"
            ]
          },
          {
            name: "Pédiatrie et Chirurgie Pédiatrique",
            chapters: [
              "Plan d'observation clinique en pédiatrie",
              "Croissance somatique",
              "Retard de croissance staturale chez l'enfant",
              "Développement Psychomoteur",
              "Infirmité motrice d'origine cérébrale",
              "Dénutrition sévère",
              "Paludisme grave chez l'enfant",
              "Anémie du Nourrisson",
              "Drépanocytose chez l'enfant",
              "Vaccination chez l'enfant PEV",
              "Diarrhée aiguë et déshydratation chez l'enfant",
              "Allaitement maternel",
              "Adaptation du nouveau-né à la vie extra utérine",
              "Examen clinique du nouveau né à la naissance",
              "Prématuré",
              "Retard de croissance Intra-utérin",
              "Post maturité",
              "Méthode Kangourou",
              "Soins essentiels du nouveau né",
              "Protection contre l'hypothermie",
              "Réanimation du nouveau né",
              "Infection néonatale",
              "Détresse respiratoire du Nouveau-né",
              "Embryofœtopathie",
              "Anémie du nouveau né",
              "Incompatibilité sanguine foeto maternelle par allo immunisation",
              "Ictère du nouveau né",
              "Urgences métaboliques",
              "Trisomie 21",
              "PEC intégrée des pathologies de l'enfant",
              "Généralités sur la chirurgie pédiatrique",
              "Occlusions néonatale",
              "Sténose hypertrophique du pylore",
              "Hernies diaphragmatique",
              "Maladie de Hirschsprung",
              "Pied bot varus équin congénital",
              "Ictères chirurgicaux de l'enfant",
              "Defects congénitaux de la paroi abdominale",
              "Appendicite aiguë de l'enfant",
              "Atrésie de l'œsophagie",
              "Malformations ano-rectale",
              "Invagination intestinale"
            ]
          }
        ]
      },
      {
        year: 6,
        title: "Sixième Année (EM6)",
        subjects: [
          {
            name: "Thérapeutique - Cardiologie",
            chapters: [
              "Traitement de l'HTA",
              "Traitement du syndrome coronarien aigu",
              "Traitement de l'insuffisance cardiaque",
              "Traitement des troubles du rythme"
            ]
          },
          {
            name: "Thérapeutique - Pathologies digestives",
            chapters: [
              "Introduction à la thérapeutique",
              "Ordonnance thérapeutique",
              "Traitement des maladies ulcéreuses gastro-duedonales",
              "Les corticoïdes",
              "Prise en charge de la pneumonie",
              "Traitement du syndrome de l'intestin irritable (SII)",
              "Traitement du reflux gastro œsophagien (RGO)"
            ]
          },
          {
            name: "Thérapeutique - Maladies infectieuses",
            chapters: [
              "Principes d'utilisation des antibiotiques",
              "Antibiothérapie",
              "Traitement Antirétroviral",
              "Traitement Antifongique",
              "Traitement Antiparasitaire",
              "Traitement du Paludisme"
            ]
          },
          {
            name: "Thérapeutique - Endocrinologie",
            chapters: [
              "Traitement diabète",
              "Traitement de l'hyperthyroïdie",
              "Traitement de l'hypothyroïdie",
              "Traitement de l'insuffisance surrénale",
              "Traitement de l'hyperprolactinemie"
            ]
          },
          {
            name: "Santé publique",
            chapters: [
              "Types d'études en épidémiologie",
              "Introduction à la santé publique",
              "Prévention et Promotion de la santé",
              "Soins de Santé Primaires",
              "Introduction à l'économie de la santé",
              "Introduction aux systèmes de santé"
            ]
          },
          {
            name: "ORL",
            chapters: [
              "Généralités sur ORL et Chirurgie cervico faciale",
              "Sémiologie et terminologie en ORL",
              "Exploration fonctionnelle de la surdité",
              "Sinusite",
              "Rhino-pharyngite",
              "Angine",
              "Otite Moyenne Aigue"
            ]
          },
          {
            name: "Psychiatrie",
            chapters: [
              "Introduction à la psychiatrie",
              "Les modèles explicatifs des troubles mentaux",
              "Les facteurs des risques des troubles mentaux",
              "Examen psychiatrique",
              "Examen somatique",
              "Troubles de la présentation et de l'expression motrice",
              "Troubles du langage",
              "Troubles de la pensée",
              "Troubles de la perception",
              "Troubles de la conscience de soi et de l'environnement",
              "Troubles de l'affectivité et de la thymie",
              "Troubles de l'humeur",
              "Troubles du jugement et du raisonnement",
              "Troubles des conduites instinctuelles (Le contrôle sphinctérien)",
              "Troubles des conduites instinctuelles (La sexualité)",
              "Troubles des conduites instinctuelles (Le Sommeil)",
              "Troubles des conduites instinctuelles (l'alimentation)",
              "Troubles anxieux"
            ]
          }
        ]
      }
    ];

    let totalSubjectsCreated = 0;
    let totalChaptersCreated = 0;

    for (const yearData of curriculum) {
      for (const subjectData of yearData.subjects) {
        // Recherche de la matière avec fallback selon le schéma
        let subject = await prisma.subject.findFirst({
          where: {
            name: subjectData.name,
          },
        });

        if (!subject) {
          subject = await prisma.subject.create({
            data: {
              name: subjectData.name,
              ...( "level" in prisma.subject.fields ? { level: yearData.year } : {}),
            } as any,
          });
          totalSubjectsCreated++;
        }

        // Ajout des chapitres liés
        for (let i = 0; i < subjectData.chapters.length; i++) {
          const chapterTitle = subjectData.chapters[i];

          const existingChapter = await prisma.chapter.findFirst({
            where: {
              subjectId: subject.id,
              OR: [
                { name: chapterTitle },
                { title: chapterTitle }
              ]
            } as any,
          });

          if (!existingChapter) {
            await prisma.chapter.create({
              data: {
                name: chapterTitle,
                title: chapterTitle,
                order: i + 1,
                subjectId: subject.id,
              } as any,
            });
            totalChaptersCreated++;
          }
        }
      }
    }

    return NextResponse.json({
      message: "Base de données mise à jour avec succès !",
      stats: {
        subjectsCreated: totalSubjectsCreated,
        chaptersCreated: totalChaptersCreated,
      },
    });
  } catch (error: any) {
    console.error("Erreur lors de l'injection du programme :", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la mise à jour.", details: error?.message },
      { status: 500 }
    );
  }
}