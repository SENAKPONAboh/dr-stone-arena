import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const curriculum = [
      // --- ANNÉE 1 ---
      { year: 1, subject: "Physiologie", chapters: ["MP", "CH", "EAB", "Comportement dipsique", "Lymphe et sa circulation", "Immunité", "Thymus", "Bioénergétique", "Métabolisme de base", "Les apports alimentaires", "Les vitamines"] },
      { year: 1, subject: "Histologie", chapters: ["Introduction", "ERU", "ERP", "EG Endocrine", "EG Exocrine", "T Conjonctif", "T Reticuleux & T Adipeux", "Tissu cartilagineux", "Tissu osseux"] },
      { year: 1, subject: "Embryologie Générale", chapters: ["Gametogenèse", "Fécondation", "1ère semaine de développement embryonnaire", "Seconde semaine", "3ème semaine"] },
      { year: 1, subject: "Chimie", chapters: ["Atomistique"] },
      { year: 1, subject: "Biochimie", chapters: ["Introduction", "Les glucides", "Les protides (a aminés et peptides)", "Les protéines", "Les lipides", "Les acides nucléiques"] },
      { year: 1, subject: "Physique", chapters: ["Cinématique", "Dynamique du point matériel", "Hydrodynamique", "Phénomènes de surface", "Mouvements vibratoires", "Ondes sonores", "Diffusion", "Thermodynamique"] },
      { year: 1, subject: "Biophysique", chapters: ["Eau", "Solutions", "Déplacements moléculaires dans les solutions", "Transferts passifs membranaires", "Pression osmotique & Ultra filtration"] },
      { year: 1, subject: "Anatomie", chapters: ["Notions de bases en anatomie", "Système squelettique", "Système articulaire", "Système cardiovasculaire", "Ostéologie du membre supérieur", "Arthrologie du membre supérieur", "Myologie du membre supérieur", "Artères du membre supérieur", "Veines du membre supérieur", "Plexus brachial", "Région de la fosse axillaire", "Ostéologie du membre pelvien", "Articulation coxo fémorale", "Articulation du genou", "Articulation de la cheville", "Myologie du bassin", "Myologie de la cuisse", "Myologie de la jambe et du pied", "Vascularisation du membre pelvien", "Plexus lombaire", "Plexus lombo-sacré", "Le trigone femoral", "Ostéologie de la tête", "Le système tégumentaire", "Organes de sens", "Le rachis ou colonne vertébrale", "Fosse poplitée", "Myologie du cou", "Les vaisseaux du cou", "Pharynx", "Larynx", "Region supraclaviculaire", "Region bicarotidienne", "Parotide"] },
      { year: 1, subject: "Biologie cellulaire", chapters: ["Introduction à la biologie cellulaire", "Membrane plasmique", "Système endomembrannaire", "La mitochondrie", "Peroxysomes", "Noyau cellulaire", "Cytosquelette", "Croissance et division cellulaire", "Matrice extra cellulaire", "Signalisation cellulaire"] },
      { year: 1, subject: "Génétique", chapters: ["Notions de base en génétique", "Réplication d'ADN", "Protéosynthèse et protéolyse", "Alterations de l'ADN", "Anomalies chromosomiques", "Cytogénétique constitutionnelle et moléculaire"] },
      { year: 1, subject: "Biostatistique", chapters: ["Les variables statistiques", "Les paramètres statistiques", "Mesure des fréquences"] },
      { year: 1, subject: "Anglais médical", chapters: ["Grammar", "Medical English"] },
      { year: 1, subject: "Informatique médicale", chapters: ["Introduction à l'informatique", "Initiation à Word", "Excel", "Power Point"] },
      { year: 1, subject: "Mathématiques", chapters: ["Dénombrements", "Probabilités", "Les statistiques"] },

      // --- ANNÉE 2 ---
      { year: 2, subject: "Physiologie", chapters: ["Le sang", "Hémostase", "Groupe sanguin", "Automatisme cardiaque", "Hémodynamique intracardiaque", "Débit cardiaque", "Pression artérielle", "Filtration glomerulaire", "Fonction tubulaire", "Concentration-Dilution urinaire", "Clairance", "Miction", "Thermorégulation", "Mécanique ventilatoire", "Échange alvéolo-capillaire", "Transport des gaz par le sang", "Régulation respiratoire", "Organisation du système nerveux", "Physiologie du neurone", "Synapse", "Somesthésie", "Physiologie de la douleur", "Motricité réflexe", "Le Cervelet", "Fonction supérieure", "Sommeil", "Système nerveux végétatif", "Liquide cérébrospinal", "Œil", "Audition", "Organisation du système hormonale", "Axe hypotalamus-hypophyse", "Hormone Thyroïdienne", "Réponse endocrine au stress", "Reproduction masculine", "Reproduction féminine", "Pancréas endocrine"] },
      { year: 2, subject: "Anatomie", chapters: ["Topographie de l'abdomen", "Paroi de l'abdomen", "Œsophage", "Estomac", "Duodenum-pancréas", "Rate", "Foie et voie biliaire", "Jéjuno-ilium", "Colon", "Topographie du pelvis", "Paroi Pelvis et Périnée", "Région rétropéritonéale", "Urètre pelvien chez la femme", "Vessie", "Rectum", "Scrotum", "Testicule", "Voies spermatiques", "Prostate", "Penis", "Utérus et annexe de l'utérus", "Appareil génitaux externe de la femme", "Vagin", "Ostéologie de la tête", "Introduction à la neuroanatomie", "La moelle spinale", "Tronc cérébrale", "Cervelet", "Cerveau", "Méninges", "Vascularisation", "Voie de la sensibilité", "Voie optique", "Généralité sur les nerfs crânienne", "Les Voies de la motricité", "Les nerfs moteurs de l'œil", "Les nerfs faciaux", "Système nerveux autonome", "Les nerfs crâniennes", "Topographie du Thorax", "Glande mammaires", "Le cœur (Tissu Nodal)", "L'aorte", "Système cave- système azygos", "Trachée", "Bronche", "Poumon", "Diaphragme", "Pédicule pulmonaire"] },
      { year: 2, subject: "Embryologie", chapters: ["Appareil respiratoire", "Appareil digestif", "Appareil urogénital", "Appareil cardio-vasculaire", "Système nerveux", "Système endocrinien", "Tête et cou", "Les Membres", "Organe de sens", "Système tégumentaire"] },
      { year: 2, subject: "Histologie", chapters: ["L'appareil digestif", "Tube digestif", "Glandes annexes au système digestif", "Appareil génital féminin", "Appareil génital masculin", "Appareil urinaire", "Appareil respiratoire", "Appareil cardio-vasculaire", "Système tégumentaire"] },
      { year: 2, subject: "Anglais", chapters: ["Medical English"] },
      { year: 2, subject: "Psychologie", chapters: ["Psychologie médicale"] },
      { year: 2, subject: "Biophysique", chapters: ["Rayonnement par émission d'un électron", "Rayonnement par émission d'un noyau", "Interaction entre le Rayonnement et la matière", "Détection et mesure", "Imagerie dans la médecine nucléaire", "Imagerie radiologique", "Imagerie par résonance magnétique", "Dosimétrie", "Échographie", "Radioprotection", "Radiothérapie", "Radiobiologie"] },
      { year: 2, subject: "Biochimie", chapters: ["Introduction à la Biochimie métabolique", "Le métabolisme", "Activité et cinétique enzymatique", "Introduction à la glycogénolyse", "Métabolisme de la glycogénèse", "Métabolisme de la néoglucogénèse", "Métabolisme général des lipides", "Protéosynthèse et prothéolyse", "Métabolisme des Acide aminé", "Métabolisme des cathécolamine", "Voie des pentoses", "Métabolisme du cholestérol", "Métabolisme des Acide biliaire", "Hormone Thyroïdienne", "Métabolisme de l'hémoglobine", "Métabolisme du fer", "Lipolyse et lipogénèse", "Cycle de krebs", "Chaîne respiratoire mitochondriale"] },
      { year: 2, subject: "Éthique et Déontologie", chapters: ["Éthique et déontologie médicale"] },
      { year: 2, subject: "Soins infirmiers", chapters: ["Hygiène hospitalière", "Hygiène des mains", "Port des gants", "A.E.S", "Température", "Pulsation", "Tension artériel", "Respiration", "Injection", "Perfusion", "Transfusion", "Ponction ascite", "Ponction lombaire", "Ponction veineuse", "Cathéterisme vésicale", "Soins de plaie", "Pansement", "Bandage"] },

      // --- ANNÉE 4 ---
      { year: 4, subject: "Pathologies uro-Néphrologie", chapters: ["IRC", "Pathogénies des néphropathies glomerulaires", "Glomerulopathies", "Néphropathie Diabétique", "Néphropathie lié aux VIH/SIDA", "Néphropathies tubulaires", "Néphropathies interstitielles", "Néphropathies vasculaires", "Néphropathies héréditaire", "IRA", "Syndrome de jonction pyélo-urétérale", "Mega uretère", "Urétérocèle", "Valves de l’urètre postérieur", "Exstrophie vésicale", "Infections urinaire basses : cystite", "Infections urinaires hautes : pyèlonephrite", "Bilharziose urogénitale", "Tuberculose urogénitale", "Rétrécissement Urétral", "Lithiase urinaire", "Fistules vésico-vaginales", "Lésions urologiques au cours des traumatismes du bassin", "Traumatisme du rein", "Tumeur de vessie", "Cancer de rein", "Paraphimosis et Phimosis", "Priapisme", "Torsion du Cordon spermatique", "Traumatisme des OGE masculin", "Gangrène de Fournier", "Principaux examens en urologie", "Hydrocele", "Cryptorchidie", "Hypospadias", "Epispadias", "Urétrite", "Orchites", "Epidymite aigue", "Prostatites aiguës", "Prostatites chroniques", "Hypertrophie bénigne de la prostate (HBP)", "Cancer de la prostate", "Cancer du testicule"] },
      { year: 4, subject: "Pathologies Digestives", chapters: ["Appendicite Aigue", "Péritonite Aigue", "Pancréatite aiguë", "Abcès du foie", "Occlusion intestinale aigue", "Volvulus du colon pelvien", "Traumatismes abdominaux", "Éventrations", "Les Hernies", "Fistules et fissures anales", "Maladies hémorroïdaires", "Tumeur bénigne du foie", "Cancer du pancréas exocrine", "Complications de la lithiase vésiculaire", "Maladies Ulcéreuses Gastro-Duodenale (MUGD)", "Hémorragies digestives", "Gastrites", "Œsophagites", "RGO", "Ictère", "Cirrhose", "Hépatites virales", "Cancer du foie", "Diverticulite", "Troubles fonctionnels intestinaux"] },
      { year: 4, subject: "Anatomopathologie spéciale", chapters: ["Pathologies de l’œsophage", "Pathologies Gastrique", "Pathologies colo-rectale", "Pathologies Hépatiques", "Pathologies du pancréas", "Pathologies tumorales du col de l’utérus", "Pathologies tumorales de l’utérus", "Pathologies tumorale des ovaires", "Pathologie tumorale de la prostate"] },
      { year: 4, subject: "Hématologie", chapters: ["Anémie par carence en fer", "Anémie par carence en facteur anti-pernicieux", "Diagnostic d’une splénomégalie (SMG)", "Diagnostic des Adénopathies (ADP)", "Transfusions sanguines", "Leucémie lymphoïde chronique", "Lymphomes", "Myélome multiples (maladie de kahler)", "Hémophilies", "Maladies de Von willebrand", "Syndrome de defribination", "Déficit en G-6PD", "Microspherocytose", "Hemoglobinopathies : Drépanocytose", "Thalassemies", "Leucémie Aigue", "Aplasies médullaire", "Leucémie myéloïde chronique", "Leucémie myélomonocytaire chronique", "Thrombocytemie essentielle", "Splénomégalie Myéloïde"] },
      { year: 4, subject: "Pathologies Respiratoires", chapters: ["Bronchite Aigue", "Pneumopathie aiguë bactérienne", "Abcès du poumon", "Aspergillome", "Pneumonie caséeuse", "Pneumopathie à SARS-CoV-2", "Amibiase pleuro-pulmonaire", "Primo-infection tuberculeuse", "Tuberculose pulmonaire commune", "Miliaire Tuberculeuse", "Coinfection Tuberculose/VIH", "Tuberculose Multi-résistante", "BPCO", "Asthme Bronchique", "Pleurésie", "Pleurésie purulente", "DDB", "Opacité Madiastinale", "Pneumothorax", "Cancers Bronchique primitif", "OAPL (Œdème Aiguë pulmonaire lésionnel)", "Sarcoïdose Mediastino-pulmonaire", "Insuffisance Respiratoire chronique", "CAT devant un Traumatisme grave du Thorax", "Drainage Thoracique", "Diagnostic d'une Tumeur Médiastinale", "Cancer Broncho-Pulmonaire", "Pneumothorax spontané", "Pyothorax", "Embolie pulmonaire"] },
      { year: 4, subject: "Pathologie Vasculaire", chapters: ["Pré requis en Chirurgie vasculaire", "Thromboses Veineuses Profonde (TVP)", "AOMI", "Ischémie aigue des membres inférieurs", "Les anévrismes artériels", "Dissection aortique", "Fistules arterio-veineuse", "Les varices des membres inférieurs"] },
      { year: 4, subject: "Pathologies cardiovasculaires", chapters: ["Insuffisance cardiaque", "Insuffisance coronaire", "Myocardites", "Myocardiopathies", "Hypertension artérielle", "Hypotension artérielle", "Troubles du rythme", "Troubles de conduction", "ECG", "SCA", "Péricardites", "EP", "OAP", "Rétrécissement Mitral", "Insuffisance Mitrale", "Endocardites infectieuses"] },
      { year: 4, subject: "Maladies infectieuses", chapters: ["Paludisme", "Amibiase", "Bilharziose", "Helminthiases digestives", "Salmonellose", "Septicémie et choc septique", "Shigelloses", "Rhumatismes Articulaires aiguë", "Méningites", "Maladies urinaires", "Tétanos", "Choléra", "Brucellose", "Tuberculose extra pulmonaire", "Généralités sur les maladies infectieuses", "L’infection par le VIH", "Les infections opportunistes liées aux VIH", "Hépatites virales", "Fièvre hémorragique", "Rougeole", "Rubéole", "Oreillon", "Poliomyélite aiguë antérieure", "Rage", "Grippe", "Covid-19", "Herpes virus", "Varicelle"] },
      { year: 4, subject: "Urgences", chapters: ["Anesthésie générale", "Réanimation du nouveau née", "Accident transfusionnel", "Les détresses respiratoires", "Traumatismes crâniens Graves", "Oxygénothérapie", "Urgences toxicologiques", "Drogues de Réanimation", "Scores de Gravité", "Les gestes qui sauvent", "États de chocs", "Brûlures", "Complications du diabète"] },
    ];

    let subjectsCreated = 0;
    let chaptersCreated = 0;

    for (const item of curriculum) {
      // Trouver ou créer la matière
      let subject = await prisma.subject.findFirst({
        where: { name: item.subject, anneeEtude: item.year }
      });

      if (!subject) {
        subject = await prisma.subject.create({
          data: { name: item.subject, anneeEtude: item.year }
        });
        subjectsCreated++;
      }

      // Pour chaque chapitre, trouver ou créer
      for (const chapterName of item.chapters) {
        const existingChapter = await prisma.chapter.findFirst({
          where: { name: chapterName, subjectId: subject.id }
        });

        if (!existingChapter) {
          await prisma.chapter.create({
            data: { name: chapterName, subjectId: subject.id }
          });
          chaptersCreated++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cours médicaux injectés avec succès !`, 
      stats: `${subjectsCreated} nouvelles matières et ${chaptersCreated} nouveaux chapitres ajoutés.`
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur lors de l'injection du cursus." }, { status: 500 });
  }
}