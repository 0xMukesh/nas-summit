import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TipLink } from "@tiplink/api";
import {
  MetadataArgs,
  TokenProgramVersion,
  TokenStandard,
} from "@metaplex-foundation/mpl-bubblegum";
import fs from "node:fs";

import {
  payer,
  CURRENT_CHUNK,
  connection,
  treeAddress,
  collectionMint,
  collectionMetadata,
  collectionMasterEdition,
} from "@/constants";
import { Data, Record } from "@/types";
import { mintCompressedNFT } from "./mint";

const sleep = (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export const processRecord = async (record: Record) => {
  if (record.is_done) {
    return;
  }

  const name = record["name"];
  console.log(`>> started processing - ${name}`);

  try {
    const tiplink = await TipLink.create();

    const compressedNFTMetadata: MetadataArgs = {
      name: "Nas Summit Dubai",
      symbol: "NAS",
      uri: record.metadata_uri,
      creators: [
        {
          address: payer.publicKey,
          verified: false,
          share: 100,
        },
        {
          address: tiplink.keypair.publicKey,
          verified: false,
          share: 0,
        },
      ],
      editionNonce: 0,
      uses: null,
      collection: null,
      primarySaleHappened: false,
      sellerFeeBasisPoints: 0,
      isMutable: false,
      tokenProgramVersion: TokenProgramVersion.Original,
      tokenStandard: TokenStandard.NonFungible,
    };

    const signature = await mintCompressedNFT(
      treeAddress,
      collectionMint,
      collectionMetadata,
      collectionMasterEdition,
      compressedNFTMetadata,
      tiplink.keypair.publicKey
    );
    console.log(`>> nft minted - ${name}`);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();
    const transaction = new Transaction();

    const transferInstruction = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: tiplink.keypair.publicKey,
      lamports: 0.0062 * LAMPORTS_PER_SOL,
    });
    transaction.add(transferInstruction);

    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    const transferSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer]
    );

    const data: Data = JSON.parse(fs.readFileSync(CURRENT_CHUNK, "utf-8"));

    for (let i = 0; i < data.length; i++) {
      if (data[i]["name"] === name) {
        data[i]["tiplink"] = tiplink.url.href;
        data[i]["is_done"] = true;
        break;
      }
    }

    fs.writeFileSync(CURRENT_CHUNK, JSON.stringify(data, null, 2), "utf-8");

    console.log(`>> updated data - ${name}`);

    console.log("===========================");
    console.log("name:", name);
    console.log("nft mint signature:", signature);
    console.log("sol transfer signature:", transferSignature);
    console.log("tiplink public key:", tiplink.keypair.publicKey.toString());
    console.log("tiplink url:", tiplink.url.href);
    console.log("===========================");
    sleep(300);
  } catch (err) {
    console.log(`>> an error occured\n${err}`);
  }
};
