;; EquiLock Equity Token Contract
;; Implements SIP-010 fungible token standard for tokenized private equity
;; Features:
;; - Tokenized equity shares with legal binding
;; - KYC/AML whitelist-based distribution
;; - Compliance rule enforcement
;; - Dividend distribution capabilities
;; - Secondary market trading controls

(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

;; =============================================================================
;; CONSTANTS
;; =============================================================================

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-not-whitelisted (err u102))
(define-constant err-kyc-not-approved (err u103))
(define-constant err-transfer-restricted (err u104))
(define-constant err-insufficient-balance (err u105))
(define-constant err-holding-period-active (err u106))
(define-constant err-invalid-amount (err u107))
(define-constant err-self-transfer (err u108))

;; =============================================================================
;; DATA VARS
;; =============================================================================

(define-data-var token-name (string-ascii 32) "EquiLock Equity Token")
(define-data-var token-symbol (string-ascii 32) "EQT")
(define-data-var token-decimals uint u6)
(define-data-var token-uri (optional (string-utf8 256)) none)
(define-data-var total-supply uint u0)
(define-data-var max-supply uint u1000000000000) ;; 1M tokens with 6 decimals
(define-data-var issuance-active bool false)

;; Legal and compliance metadata
(define-data-var legal-document-hash (string-ascii 64) "")
(define-data-var issuer-name (string-ascii 128) "")
(define-data-var holding-period uint u7776000) ;; 90 days in seconds (90 * 24 * 60 * 60)

;; =============================================================================
;; DATA MAPS
;; =============================================================================

;; Core SIP-010 fungible token
(define-fungible-token equity-token)

;; KYC and whitelist management
(define-map kyc-status principal 
  {
    status: (string-ascii 16), ;; "pending", "approved", "rejected", "expired"
    approved-at: (optional uint),
    expires-at: (optional uint),
    tier: uint ;; 1=retail, 2=accredited, 3=institutional
  }
)

(define-map whitelist principal 
  {
    approved: bool,
    added-at: uint,
    added-by: principal
  }
)

;; Compliance rules and restrictions
(define-map transfer-restrictions principal 
  {
    can-transfer: bool,
    holding-period-end: uint,
    last-transfer: uint
  }
)

;; Token issuance tracking
(define-map token-issuances uint 
  {
    recipient: principal,
    amount: uint,
    issued-at: uint,
    legal-doc-hash: (string-ascii 64),
    vesting-schedule: (optional uint) ;; blocks until fully vested
  }
)

(define-data-var next-issuance-id uint u1)

;; Dividend distribution tracking
(define-map dividend-distributions uint
  {
    total-amount: uint,
    per-token-amount: uint,
    declared-at: uint,
    payment-deadline: uint,
    payment-token: (optional principal) ;; STX if none
  }
)

(define-map dividend-claims 
  { distribution-id: uint, recipient: principal }
  { claimed: bool, amount: uint, claimed-at: (optional uint) }
)

(define-data-var next-dividend-id uint u1)

;; =============================================================================
;; AUTHORIZATION FUNCTIONS
;; =============================================================================

(define-private (is-owner)
  (is-eq tx-sender contract-owner)
)

(define-private (is-whitelisted (user principal))
  (default-to false 
    (get approved (map-get? whitelist user))
  )
)

(define-private (is-kyc-approved (user principal))
  (let ((kyc-data (map-get? kyc-status user)))
    (match kyc-data
      data (and 
        (is-eq (get status data) "approved")
        (match (get expires-at data)
          expires (< block-height expires)
          true
        )
      )
      false
    )
  )
)

(define-private (can-transfer-check (sender principal) (recipient principal))
  (and 
    (is-kyc-approved sender)
    (is-kyc-approved recipient)
    (is-whitelisted sender)
    (is-whitelisted recipient)
    (not (is-eq sender recipient))
  )
)

;; =============================================================================
;; SIP-010 STANDARD FUNCTIONS
;; =============================================================================

(define-read-only (get-name)
  (ok (var-get token-name))
)

(define-read-only (get-symbol)
  (ok (var-get token-symbol))
)

(define-read-only (get-decimals)
  (ok (var-get token-decimals))
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance equity-token who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply equity-token))
)

(define-read-only (get-token-uri)
  (ok (var-get token-uri))
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    ;; Verify sender is tx-sender
    (asserts! (is-eq tx-sender sender) err-not-token-owner)
    
    ;; Verify amount is positive
    (asserts! (> amount u0) err-invalid-amount)
    
    ;; Verify not self-transfer
    (asserts! (not (is-eq sender recipient)) err-self-transfer)
    
    ;; Verify compliance checks
    (asserts! (can-transfer-check sender recipient) err-transfer-restricted)
    
    ;; Check holding period for sender
    (let ((restriction-data (map-get? transfer-restrictions sender)))
      (match restriction-data
        data (asserts! (< (get holding-period-end data) block-height) err-holding-period-active)
        true ;; No restrictions if no data
      )
    )
    
    ;; Execute transfer
    (try! (ft-transfer? equity-token amount sender recipient))
    
    ;; Update transfer tracking
    (map-set transfer-restrictions sender 
      {
        can-transfer: true,
        holding-period-end: (+ block-height (var-get holding-period)),
        last-transfer: block-height
      }
    )
    
    ;; Print memo if provided
    (match memo 
      to-print (print to-print) 
      0x
    )
    
    (ok true)
  )
)

;; =============================================================================
;; ADMINISTRATIVE FUNCTIONS
;; =============================================================================

(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
  (begin
    (asserts! (is-owner) err-owner-only)
    (var-set token-uri new-uri)
    (ok true)
  )
)

(define-public (update-legal-document (new-hash (string-ascii 64)))
  (begin
    (asserts! (is-owner) err-owner-only)
    (var-set legal-document-hash new-hash)
    (ok true)
  )
)

(define-public (set-issuer-name (name (string-ascii 128)))
  (begin
    (asserts! (is-owner) err-owner-only)
    (var-set issuer-name name)
    (ok true)
  )
)

(define-public (set-holding-period (period uint))
  (begin
    (asserts! (is-owner) err-owner-only)
    (var-set holding-period period)
    (ok true)
  )
)

(define-public (toggle-issuance (active bool))
  (begin
    (asserts! (is-owner) err-owner-only)
    (var-set issuance-active active)
    (ok true)
  )
)

;; =============================================================================
;; KYC AND WHITELIST MANAGEMENT
;; =============================================================================

(define-public (update-kyc-status (user principal) (status (string-ascii 16)) (tier uint) (expires-at (optional uint)))
  (begin
    (asserts! (is-owner) err-owner-only)
    (map-set kyc-status user 
      {
        status: status,
        approved-at: (if (is-eq status "approved") (some block-height) none),
        expires-at: expires-at,
        tier: tier
      }
    )
    (ok true)
  )
)

(define-public (add-to-whitelist (user principal))
  (begin
    (asserts! (is-owner) err-owner-only)
    (map-set whitelist user 
      {
        approved: true,
        added-at: block-height,
        added-by: tx-sender
      }
    )
    (ok true)
  )
)

(define-public (remove-from-whitelist (user principal))
  (begin
    (asserts! (is-owner) err-owner-only)
    (map-set whitelist user 
      {
        approved: false,
        added-at: block-height,
        added-by: tx-sender
      }
    )
    (ok true)
  )
)

;; =============================================================================
;; TOKEN ISSUANCE FUNCTIONS
;; =============================================================================

(define-public (issue-tokens (recipient principal) (amount uint) (legal-doc-hash (string-ascii 64)))
  (let ((issuance-id (var-get next-issuance-id)))
    (begin
      ;; Only owner can issue
      (asserts! (is-owner) err-owner-only)
      
      ;; Issuance must be active
      (asserts! (var-get issuance-active) err-transfer-restricted)
      
      ;; Amount must be positive
      (asserts! (> amount u0) err-invalid-amount)
      
      ;; Recipient must be KYC approved and whitelisted
      (asserts! (is-kyc-approved recipient) err-kyc-not-approved)
      (asserts! (is-whitelisted recipient) err-not-whitelisted)
      
      ;; Check max supply
      (asserts! (<= (+ (ft-get-supply equity-token) amount) (var-get max-supply)) err-invalid-amount)
      
      ;; Mint tokens
      (try! (ft-mint? equity-token amount recipient))
      
      ;; Record issuance
      (map-set token-issuances issuance-id 
        {
          recipient: recipient,
          amount: amount,
          issued-at: block-height,
          legal-doc-hash: legal-doc-hash,
          vesting-schedule: none
        }
      )
      
      ;; Set holding period for recipient
      (map-set transfer-restrictions recipient 
        {
          can-transfer: true,
          holding-period-end: (+ block-height (var-get holding-period)),
          last-transfer: block-height
        }
      )
      
      ;; Increment issuance ID
      (var-set next-issuance-id (+ issuance-id u1))
      
      (ok issuance-id)
    )
  )
)

(define-public (batch-issue-tokens (recipients (list 50 { recipient: principal, amount: uint })) (legal-doc-hash (string-ascii 64)))
  (begin
    (asserts! (is-owner) err-owner-only)
    (asserts! (var-get issuance-active) err-transfer-restricted)
    (fold batch-issue-helper recipients (ok legal-doc-hash))
  )
)

(define-private (batch-issue-helper (item { recipient: principal, amount: uint }) (memo-result (response (string-ascii 64) uint)))
  (match memo-result
    legal-hash (issue-tokens (get recipient item) (get amount item) legal-hash)
    error (err error)
  )
)

;; =============================================================================
;; DIVIDEND DISTRIBUTION FUNCTIONS
;; =============================================================================

(define-public (declare-dividend (total-amount uint) (payment-deadline uint))
  (let ((dividend-id (var-get next-dividend-id))
        (current-supply (ft-get-supply equity-token)))
    (begin
      (asserts! (is-owner) err-owner-only)
      (asserts! (> total-amount u0) err-invalid-amount)
      (asserts! (> current-supply u0) err-invalid-amount)
      
      (map-set dividend-distributions dividend-id 
        {
          total-amount: total-amount,
          per-token-amount: (/ total-amount current-supply),
          declared-at: block-height,
          payment-deadline: payment-deadline,
          payment-token: none
        }
      )
      
      (var-set next-dividend-id (+ dividend-id u1))
      (ok dividend-id)
    )
  )
)

(define-public (claim-dividend (distribution-id uint))
  (let ((distribution (unwrap! (map-get? dividend-distributions distribution-id) err-invalid-amount))
        (user-balance (ft-get-balance equity-token tx-sender))
        (claim-key { distribution-id: distribution-id, recipient: tx-sender }))
    (begin
      ;; Check if already claimed
      (asserts! (is-none (map-get? dividend-claims claim-key)) err-transfer-restricted)
      
      ;; Check deadline
      (asserts! (< block-height (get payment-deadline distribution)) err-transfer-restricted)
      
      ;; Calculate amount
      (let ((claim-amount (* user-balance (get per-token-amount distribution))))
        (begin
          ;; Record claim
          (map-set dividend-claims claim-key 
            {
              claimed: true,
              amount: claim-amount,
              claimed-at: (some block-height)
            }
          )
          
          ;; Transfer STX (simplified - in production would handle other tokens)
          (try! (stx-transfer? claim-amount (as-contract tx-sender) tx-sender))
          
          (ok claim-amount)
        )
      )
    )
  )
)

;; =============================================================================
;; READ-ONLY FUNCTIONS
;; =============================================================================

(define-read-only (get-kyc-status (user principal))
  (map-get? kyc-status user)
)

(define-read-only (get-whitelist-status (user principal))
  (map-get? whitelist user)
)

(define-read-only (get-transfer-restrictions (user principal))
  (map-get? transfer-restrictions user)
)

(define-read-only (get-issuance-details (issuance-id uint))
  (map-get? token-issuances issuance-id)
)

(define-read-only (get-dividend-distribution (distribution-id uint))
  (map-get? dividend-distributions distribution-id)
)

(define-read-only (get-dividend-claim (distribution-id uint) (recipient principal))
  (map-get? dividend-claims { distribution-id: distribution-id, recipient: recipient })
)

(define-read-only (get-contract-info)
  (ok {
    name: (var-get token-name),
    symbol: (var-get token-symbol),
    decimals: (var-get token-decimals),
    total-supply: (ft-get-supply equity-token),
    max-supply: (var-get max-supply),
    issuance-active: (var-get issuance-active),
    legal-document-hash: (var-get legal-document-hash),
    issuer-name: (var-get issuer-name),
    holding-period: (var-get holding-period),
    contract-owner: contract-owner
  })
)

(define-read-only (can-transfer (sender principal) (recipient principal) (amount uint))
  (ok (and 
    (can-transfer-check sender recipient)
    (>= (ft-get-balance equity-token sender) amount)
    (> amount u0)
  ))
)