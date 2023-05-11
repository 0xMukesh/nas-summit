import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { TipLink } from "@tiplink/api";
import { File } from "web3.storage";
import axios, { AxiosError } from "axios";
import fs from "node:fs";

import {
  web3Storage,
  metaplex,
  payer,
  CURRENT_CHUNK,
  connection,
  treeAddress,
  collectionMint,
} from "./constants";
import { Data, Record } from "./types";

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
    const response = await axios.get(
      `http://localhost:3000/api/image?name=${name}`,
      {
        responseType: "arraybuffer",
      }
    );
    const imageBuffer = (await response.data) as Buffer;
    console.log(`>> fetched the image buffer - ${name} `);

    if (imageBuffer.length === 0) {
      fs.writeFileSync(
        "errors.log",
        `\nrecieved empty image buffer - ${name}\n`,
        "utf-8"
      );
      return;
    }
    const imageFile = new File([imageBuffer], "poap.png", {
      type: "image/png",
    });
    console.log(`>> uploaded the image on ipfs - ${name}`);
    const imageCID = await web3Storage.put([imageFile]);

    const metadata = {
      name: "Nas Summit Dubai",
      symbol: "NAS",
      description: "Nas Daily x Dubai",
      image: `https://${imageCID}.ipfs.w3s.link/poap.png`,
      properties: {
        files: [
          {
            uri: `https://${imageCID}.ipfs.w3s.link/poap.png`,
            type: "image/png",
          },
        ],
        category: null,
      },
    };

    const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", {
      type: "application/json",
    });
    console.log(`>> uploaded the metadata on ipfs - ${name}`);
    const metadataCID = await web3Storage.put([metadataFile]);

    const tiplink = await TipLink.create();
    const nft = await metaplex.nfts().create(
      {
        uri: `https://${metadataCID}.ipfs.w3s.link/metadata.json`,
        name: "Nas Summit Dubai",
        symbol: "NAS",
        sellerFeeBasisPoints: 0,
        tokenOwner: tiplink.keypair.publicKey,
        collection: collectionMint,
        collectionAuthority: payer,
        tree: treeAddress,
      },
      {
        commitment: "finalized",
      }
    );
    console.log(`>> nft minted - ${name}`);

    const transaction = new Transaction();
    const solTransferInstruction = SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: tiplink.keypair.publicKey,
      lamports: 0.0062 * LAMPORTS_PER_SOL,
    });
    transaction.add(solTransferInstruction);
    sleep(300);
    const solTransferSignature = await sendAndConfirmTransaction(
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
    console.log("nft mint signature:", nft.response.signature);
    console.log("sol transfer signature:", solTransferSignature);
    console.log("buffer", imageBuffer);
    console.log("image cid:", imageCID);
    console.log("metadata cid:", metadataCID);
    console.log("token address:", nft.mintAddress.toString());
    console.log("tiplink public key:", tiplink.keypair.publicKey.toString());
    console.log("tiplink url:", tiplink.url.href);
    console.log("===========================");
  } catch (err) {
    console.log(`>> an error occured\n${err}`);
    if (err instanceof AxiosError) {
      console.log(
        `>> an axios error is occured\nmessage - ${err.message}\ncause - ${err.cause}`
      );
    }
  }
};
