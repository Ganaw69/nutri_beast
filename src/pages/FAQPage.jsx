import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';

const FAQ = [
  { title: 'Commandes et livraison', items: [
    ['Comment passer une commande ?', 'Parcourez le catalogue, sélectionnez vos produits, ajoutez-les au panier puis suivez les étapes de validation de votre commande.'],
    ['Quels sont les délais de livraison ?', 'Les délais dépendent de l’adresse de livraison et de la disponibilité des produits. Les informations applicables sont indiquées lors de la commande.'],
    ['Livrez-vous dans toute la Tunisie ?', 'Les zones de livraison disponibles sont indiquées lors de la commande.'],
    ['Quels sont les frais de livraison ?', 'Les frais éventuels et les conditions applicables sont affichés avant la validation de la commande.'],
    ['Comment suivre ma commande ?', 'Consultez le statut de votre commande si cette option est disponible, ou contactez notre service client en indiquant votre numéro de commande.'],
    ['Puis-je modifier ou annuler ma commande ?', 'Contactez rapidement le service client. Une modification ou une annulation dépend de l’état de préparation de la commande.'],
  ] },
  { title: 'Paiement', items: [
    ['Quels moyens de paiement acceptez-vous ?', 'Les moyens de paiement proposés sont ceux affichés au moment de la commande.'],
    ['Le paiement en ligne est-il sécurisé ?', 'Lorsqu’un prestataire de paiement est proposé, la transaction suit les modalités de sécurité de ce prestataire.'],
    ['Puis-je payer à la livraison ?', 'Les options de paiement disponibles sont indiquées lors de la commande.'],
  ] },
  { title: 'Protéines et compléments alimentaires', items: [
    ['Quelle protéine choisir pour prendre de la masse musculaire ?', 'La whey peut compléter les apports quotidiens en protéines. Le choix dépend de vos besoins, de votre alimentation, de votre tolérance digestive et de vos objectifs.'],
    ['Quelle est la différence entre whey concentrée et isolate ?', 'La whey isolate est généralement davantage filtrée et contient une proportion plus élevée de protéines, avec moins de lactose, de glucides et de lipides que la whey concentrée.'],
    ['Comment utiliser la whey protéine ?', 'Suivez les instructions figurant sur l’emballage. La whey complète l’alimentation sans remplacer une alimentation équilibrée.'],
    ['Les compléments alimentaires sont-ils indispensables ?', 'Non. Une alimentation adaptée, un entraînement régulier et une bonne récupération restent essentiels.'],
    ['La créatine est-elle réservée aux sportifs professionnels ?', 'Non. La créatine monohydrate est utilisée pour soutenir les performances lors d’efforts courts et intenses. Son utilisation doit être adaptée à chaque situation.'],
    ['Comment vérifier l’authenticité d’un produit ?', 'Vérifiez l’emballage, le scellé, le numéro de lot et la date de péremption. Contactez le service client en cas de doute.'],
    ['Comment conserver mes compléments alimentaires ?', 'Respectez les instructions du fabricant et conservez les produits dans un endroit adapté, à l’abri des conditions susceptibles de les détériorer.'],
  ] },
  { title: 'Packs personnalisés et promotions', items: [
    ['Puis-je créer mon propre pack de compléments ?', 'Si le configurateur de packs est disponible, vous pouvez sélectionner les produits proposés pour composer un pack personnalisé.'],
    ['Comment le prix de mon pack est-il calculé ?', 'Le prix dépend des produits sélectionnés et des tarifs appliqués. Vérifiez le prix final affiché avant l’ajout au panier.'],
    ['Puis-je choisir plusieurs exemplaires d’un même produit ?', 'Cela dépend des options du configurateur et des stocks disponibles.'],
    ['Les packs personnalisés sont-ils soumis aux stocks ?', 'Oui. La disponibilité dépend des stocks des produits sélectionnés.'],
    ['Comment utiliser un code promotionnel ?', 'Saisissez votre code dans le champ prévu à cet effet et vérifiez l’application de la réduction avant de valider la commande.'],
  ] },
  { title: 'Retours et service client', items: [
    ['Puis-je retourner un produit ?', 'Les retours dépendent de la politique de la boutique et de la réglementation applicable. Contactez le service client avant tout retour.'],
    ['Que faire si ma commande arrive endommagée ?', 'Prenez des photos du colis et du produit, puis contactez le service client avec votre numéro de commande.'],
    ['Comment contacter le service client ?', 'Écrivez à contact@proteinstore.tn en précisant l’objet de votre demande et, le cas échéant, votre numéro de commande.'],
    ['Comment obtenir des conseils pour choisir mes produits ?', 'Consultez les descriptions et informations nutritionnelles des produits. Pour toute question médicale, demandez conseil à un professionnel de santé.'],
  ] },
];

export const FAQPage = () => {
  const [openItem, setOpenItem] = useState(null);
  return <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
    <header className="mb-10 text-center"><p className="text-xs font-black uppercase tracking-[.25em] text-[#d90429]">Aide & infos</p><h1 className="mt-3 text-3xl font-black uppercase text-white sm:text-4xl">Questions fréquentes</h1><p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-400">Retrouvez les réponses aux questions les plus courantes sur les commandes, les produits et les packs.</p></header>
    <div className="space-y-9">{FAQ.map((category, categoryIndex) => <section key={category.title}><h2 className="mb-3 border-b border-white/10 pb-3 text-lg font-black text-white">{category.title}</h2><div className="divide-y divide-white/10">{category.items.map(([question, answer], itemIndex) => { const id = `${categoryIndex}-${itemIndex}`; const isOpen = openItem === id; return <article key={question}><button type="button" aria-expanded={isOpen} onClick={() => setOpenItem(isOpen ? null : id)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-bold text-gray-200 hover:text-white"><span>{question}</span>{isOpen ? <Minus size={17} className="shrink-0 text-[#d90429]" /> : <Plus size={17} className="shrink-0 text-[#d90429]" />}</button><div className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><p className="pb-4 pr-8 text-sm leading-6 text-gray-400">{answer}</p></div></div></article>; })}</div></section>)}</div>
  </section>;
};
export default FAQPage;
