import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import * as secp from '@noble/secp256k1';
import { bech32 } from "bech32";

import { setPrivateKey, setPublicKey } from "../state/Login";
import { EmailRegex } from "../Const";

export default function LoginPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const publicKey = useSelector(s => s.login.publicKey);
    const [key, setKey] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (publicKey) {
            navigate("/");
        }
    }, [publicKey]);

    function bech32ToHex(str) {
        let nKey = bech32.decode(str);
        let buff = bech32.fromWords(nKey.words);
        return secp.utils.bytesToHex(Uint8Array.from(buff));
    }

    async function getNip05PubKey(addr) {
        let [username, domain] = addr.split("@");
        let rsp = await fetch(`https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(username)}`);
        if (rsp.ok) {
            let data = await rsp.json();
            let pKey = data.names[username];
            if (pKey) {
                return pKey;
            }
        }
        throw "User key not found"
    }

    async function doLogin() {

        try {
            if (key.startsWith("nsec")) {
                let hexKey = bech32ToHex(key);
                if (secp.utils.isValidPrivateKey(hexKey)) {
                    dispatch(setPrivateKey(hexKey));
                } else {
                    throw "INVALID PRIVATE KEY";
                }
            } else if (key.startsWith("npub")) {
                let hexKey = bech32ToHex(key);
                dispatch(setPublicKey(hexKey));
            } else if (key.match(EmailRegex)) {
                let hexKey = await getNip05PubKey(key);
                dispatch(setPublicKey(hexKey));
            } else {
                if (secp.utils.isValidPrivateKey(key)) {
                    dispatch(setPrivateKey(key));
                } else {
                    throw "INVALID PRIVATE KEY";
                }
            }
        } catch (e) {
            setError(`Failed to load NIP-05 pub key (${e})`);
            console.error(e);
        }
    }

    async function makeRandomKey() {
        let newKey = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
        dispatch(setPrivateKey(newKey))
        navigate("/new");
    }

    async function doNip07Login() {
        let pubKey = await window.nostr.getPublicKey();
        dispatch(setPublicKey(pubKey));
    }

    function altLogins() {
        let nip07 = 'nostr' in window;
        if (!nip07) {
            return null;
        }

        return (
            <>
                <h2>Other Login Methods</h2>
                <div className="flex">
                    <div className="btn" onClick={(e) => doNip07Login()}>Login with Extension (NIP-07)</div>
                </div>
            </>
        )
    }

    return (
        <>
            <h1>Login</h1>
            <div className="flex">
                <input type="text" placeholder="nsec / npub / nip-05 / hex private key..." className="f-grow" onChange={e => setKey(e.target.value)} />
            </div>
            {error.length > 0 ? <b className="error">{error}</b> : null}
            <div className="tabs">
                <div className="btn" onClick={(e) => doLogin()}>Login</div>
                <div className="btn" onClick={() => makeRandomKey()}>Generate Key</div>
            </div>
            {altLogins()}
        </>
    );
}