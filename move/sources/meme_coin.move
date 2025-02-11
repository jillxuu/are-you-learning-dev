module meme_factory::meme_coin {
    use std::option::{Self, Option};
    use std::signer;
    use std::string::{Self, String};
    use std::vector;

    use aptos_std::table::{Self, Table};

    use aptos_framework::aptos_account;
    use aptos_framework::event;
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::object::{Self, Object, ObjectCore};
    use aptos_framework::primary_fungible_store;

    /// Only admin can update creator
    const EONLY_ADMIN: u64 = 1;
    /// Only admin can set pending admin
    const EONLY_ADMIN_CAN_SET_PENDING_ADMIN: u64 = 2;
    /// Sender is not pending admin
    const ENOT_PENDING_ADMIN: u64 = 3;
    /// Only admin can update mint fee collector
    const EONLY_ADMIN_CAN_UPDATE_MINT_FEE_COLLECTOR: u64 = 4;

    // @editable-begin Basic Configuration - Customize error codes and validation rules
    /// Score must be between 0 and 100
    const EINVALID_SCORE: u64 = 5;
    /// No mint limit
    const ENO_MINT_LIMIT: u64 = 6;
    /// Mint limit reached
    const EMINT_LIMIT_REACHED: u64 = 7;
    // @editable-end

    // @editable-begin Token Economics - Configure default minting and fee parameters
    /// Default amount to mint to creator when creating FA
    /// Set this higher if you want creators to receive initial tokens
    const DEFAULT_PRE_MINT_AMOUNT: u64 = 0;
    
    /// Default mint fee per smallest unit of FA denominated in APT
    /// Increase this to add a cost for minting tokens
    const DEFAULT_MINT_FEE_PER_SMALLEST_UNIT: u64 = 0;
    // @editable-end

    // @editable-begin Event Definitions - Define what information to track
    /// Emitted when a new meme coin is created
    /// Add any additional fields you want to track
    #[event]
    struct CreateMemeEvent has store, drop {
        creator_addr: address,
        meme_owner_obj: Object<MemeOwnerConfig>,
        meme_obj: Object<Metadata>,
        max_supply: Option<u128>,
        name: String,
        symbol: String,
        decimals: u8,
        icon_uri: String,
        project_uri: String,
        mint_fee_per_smallest_unit: u64,
        pre_mint_amount: u64,
        mint_limit_per_addr: Option<u64>,
    }

    /// Emitted when tokens are minted
    /// Tracks minting activity and fees
    #[event]
    struct MintMemeEvent has store, drop {
        meme_obj: Object<Metadata>,
        amount: u64,
        recipient_addr: address,
        total_mint_fee: u64,
    }

    /// Emitted when degen metrics are updated
    /// Helps track risk and potential
    #[event]
    struct UpdateDegenMetricsEvent has store, drop {
        meme_obj: Object<Metadata>,
        moon_score: u64,
        rug_risk: u64,
    }
    // @editable-end

    /// Unique per meme coin
    struct MemeOwnerConfig has key {
        meme_obj: Object<Metadata>
    }

    /// Unique per meme coin
    struct MemeController has key {
        mint_ref: fungible_asset::MintRef,
        burn_ref: fungible_asset::BurnRef,
        transfer_ref: fungible_asset::TransferRef,
    }

    // @editable-begin Minting Controls - Define minting limits and tracking
    /// Controls how many tokens each address can mint
    struct MintLimit has store {
        /// Maximum number of tokens an address can mint
        limit: u64,
        /// Tracks how many tokens each address has minted
        mint_tracker: Table<address, u64>,
    }
    // @editable-end

    // @editable-begin Meme Coin Properties - Define your token's characteristics
    /// Core configuration for each meme coin
    struct MemeConfig has key {
        /// Fee per smallest unit when minting
        mint_fee_per_smallest_unit: u64,
        /// Optional limit on minting per address
        mint_limit: Option<MintLimit>,
        /// Reference to the meme coin owner
        meme_owner_obj: Object<MemeOwnerConfig>,
        /// Score indicating potential for price increase (0-100)
        moon_score: u64,
        /// Score indicating risk of price decrease (0-100)
        rug_risk: u64,
        /// Whether holders receive rewards
        holder_rewards_enabled: bool,
    }
    // @editable-end

    /// Global per contract
    struct Registry has key {
        meme_objects: vector<Object<Metadata>>,
    }

    /// Global per contract
    struct Config has key {
        admin_addr: address,
        pending_admin_addr: Option<address>,
        mint_fee_collector_addr: address,
    }

    fun init_module(sender: &signer) {
        move_to(sender, Registry {
            meme_objects: vector::empty()
        });
        move_to(sender, Config {
            admin_addr: signer::address_of(sender),
            pending_admin_addr: option::none(),
            mint_fee_collector_addr: signer::address_of(sender),
        });
    }

    // ================================= Entry Functions ================================= //

    public entry fun set_pending_admin(sender: &signer, new_admin: address) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@meme_factory);
        assert!(is_admin(config, sender_addr), EONLY_ADMIN_CAN_SET_PENDING_ADMIN);
        config.pending_admin_addr = option::some(new_admin);
    }

    public entry fun accept_admin(sender: &signer) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@meme_factory);
        assert!(config.pending_admin_addr == option::some(sender_addr), ENOT_PENDING_ADMIN);
        config.admin_addr = sender_addr;
        config.pending_admin_addr = option::none();
    }

    public entry fun update_mint_fee_collector(sender: &signer, new_collector: address) acquires Config {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global_mut<Config>(@meme_factory);
        assert!(is_admin(config, sender_addr), EONLY_ADMIN_CAN_UPDATE_MINT_FEE_COLLECTOR);
        config.mint_fee_collector_addr = new_collector;
    }

    public entry fun create_meme(
        sender: &signer,
        max_supply: Option<u128>,
        name: String,
        symbol: String,
        decimals: u8,
        icon_uri: String,
        project_uri: String,
        mint_fee_per_smallest_unit: Option<u64>,
        pre_mint_amount: Option<u64>,
        mint_limit_per_addr: Option<u64>,
    ) acquires Registry, MemeController {
        let sender_addr = signer::address_of(sender);

        let meme_owner_obj_constructor_ref = &object::create_object(@meme_factory);
        let meme_owner_obj_signer = &object::generate_signer(meme_owner_obj_constructor_ref);

        let meme_obj_constructor_ref = &object::create_named_object(
            meme_owner_obj_signer,
            *string::bytes(&name),
        );
        let meme_obj_signer = &object::generate_signer(meme_obj_constructor_ref);

        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            meme_obj_constructor_ref,
            max_supply,
            name,
            symbol,
            decimals,
            icon_uri,
            project_uri
        );

        let meme_obj = object::object_from_constructor_ref(meme_obj_constructor_ref);
        move_to(meme_owner_obj_signer, MemeOwnerConfig {
            meme_obj,
        });

        let meme_owner_obj = object::object_from_constructor_ref(meme_owner_obj_constructor_ref);
        let mint_ref = fungible_asset::generate_mint_ref(meme_obj_constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(meme_obj_constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(meme_obj_constructor_ref);

        move_to(meme_obj_signer, MemeController {
            mint_ref,
            burn_ref,
            transfer_ref,
        });

        move_to(meme_obj_signer, MemeConfig {
            mint_fee_per_smallest_unit: *option::borrow_with_default(&mint_fee_per_smallest_unit, &DEFAULT_MINT_FEE_PER_SMALLEST_UNIT),
            mint_limit: if (option::is_some(&mint_limit_per_addr)) {
                option::some(MintLimit {
                    limit: *option::borrow(&mint_limit_per_addr),
                    mint_tracker: table::new()
                })
            } else {
                option::none()
            },
            meme_owner_obj,
            moon_score: 0,
            rug_risk: 0,
            holder_rewards_enabled: false,
        });

        let registry = borrow_global_mut<Registry>(@meme_factory);
        vector::push_back(&mut registry.meme_objects, meme_obj);

        event::emit(CreateMemeEvent {
            creator_addr: sender_addr,
            meme_owner_obj,
            meme_obj,
            max_supply,
            name,
            symbol,
            decimals,
            icon_uri,
            project_uri,
            mint_fee_per_smallest_unit: *option::borrow_with_default(&mint_fee_per_smallest_unit, &DEFAULT_MINT_FEE_PER_SMALLEST_UNIT),
            pre_mint_amount: *option::borrow_with_default(&pre_mint_amount, &DEFAULT_PRE_MINT_AMOUNT),
            mint_limit_per_addr,
        });

        if (*option::borrow_with_default(&pre_mint_amount, &DEFAULT_PRE_MINT_AMOUNT) > 0) {
            let amount = *option::borrow(&pre_mint_amount);
            mint_meme_internal(sender, meme_obj, amount, 0);
        }
    }

    public entry fun mint_meme(
        sender: &signer,
        meme_obj: Object<Metadata>,
        amount: u64
    ) acquires MemeController, MemeConfig, Config {
        let sender_addr = signer::address_of(sender);
        check_mint_limit_and_update_mint_tracker(sender_addr, meme_obj, amount);
        let total_mint_fee = get_mint_fee(meme_obj, amount);
        pay_for_mint(sender, total_mint_fee);
        mint_meme_internal(sender, meme_obj, amount, total_mint_fee);
    }

    public entry fun set_moon_score(
        sender: &signer,
        meme_obj: Object<Metadata>,
        score: u64,
    ) acquires Config, MemeConfig {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@meme_factory);
        assert!(is_admin(config, sender_addr), EONLY_ADMIN);
        assert!(score <= 100, EINVALID_SCORE);

        let meme_config = borrow_global_mut<MemeConfig>(object::object_address(&meme_obj));
        meme_config.moon_score = score;

        event::emit(UpdateDegenMetricsEvent {
            meme_obj,
            moon_score: score,
            rug_risk: meme_config.rug_risk,
        });
    }

    public entry fun set_rug_risk(
        sender: &signer,
        meme_obj: Object<Metadata>,
        risk: u64,
    ) acquires Config, MemeConfig {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@meme_factory);
        assert!(is_admin(config, sender_addr), EONLY_ADMIN);
        assert!(risk <= 100, EINVALID_SCORE);

        let meme_config = borrow_global_mut<MemeConfig>(object::object_address(&meme_obj));
        meme_config.rug_risk = risk;

        event::emit(UpdateDegenMetricsEvent {
            meme_obj,
            moon_score: meme_config.moon_score,
            rug_risk: risk,
        });
    }

    public entry fun enable_holder_rewards(
        sender: &signer,
        meme_obj: Object<Metadata>,
    ) acquires Config, MemeConfig {
        let sender_addr = signer::address_of(sender);
        let config = borrow_global<Config>(@meme_factory);
        assert!(is_admin(config, sender_addr), EONLY_ADMIN);

        let meme_config = borrow_global_mut<MemeConfig>(object::object_address(&meme_obj));
        meme_config.holder_rewards_enabled = true;
    }

    // ================================= View Functions ================================== //

    #[view]
    public fun get_admin(): address acquires Config {
        let config = borrow_global<Config>(@meme_factory);
        config.admin_addr
    }

    #[view]
    public fun get_pending_admin(): Option<address> acquires Config {
        let config = borrow_global<Config>(@meme_factory);
        config.pending_admin_addr
    }

    #[view]
    public fun get_mint_fee_collector(): address acquires Config {
        let config = borrow_global<Config>(@meme_factory);
        config.mint_fee_collector_addr
    }

    #[view]
    public fun get_registry(): vector<Object<Metadata>> acquires Registry {
        let registry = borrow_global<Registry>(@meme_factory);
        registry.meme_objects
    }

    #[view]
    public fun get_degen_metrics(
        meme_obj: Object<Metadata>
    ): (u64, u64, bool) acquires MemeConfig {
        let meme_config = borrow_global<MemeConfig>(object::object_address(&meme_obj));
        (meme_config.moon_score, meme_config.rug_risk, meme_config.holder_rewards_enabled)
    }

    #[view]
    public fun get_mint_limit(
        meme_obj: Object<Metadata>,
    ): Option<u64> acquires MemeConfig {
        let meme_config = borrow_global<MemeConfig>(object::object_address(&meme_obj));
        if (option::is_some(&meme_config.mint_limit)) {
            option::some(option::borrow(&meme_config.mint_limit).limit)
        } else {
            option::none()
        }
    }

    #[view]
    public fun get_current_minted_amount(
        meme_obj: Object<Metadata>,
        addr: address
    ): u64 acquires MemeConfig {
        let meme_config = borrow_global<MemeConfig>(object::object_address(&meme_obj));
        assert!(option::is_some(&meme_config.mint_limit), ENO_MINT_LIMIT);
        let mint_limit = option::borrow(&meme_config.mint_limit);
        let mint_tracker = &mint_limit.mint_tracker;
        *table::borrow_with_default(mint_tracker, addr, &0)
    }

    #[view]
    public fun get_mint_fee(
        meme_obj: Object<Metadata>,
        amount: u64,
    ): u64 acquires MemeConfig {
        let meme_config = borrow_global<MemeConfig>(object::object_address(&meme_obj));
        amount * meme_config.mint_fee_per_smallest_unit
    }

    // ================================= Helper Functions ================================== //

    fun is_admin(config: &Config, sender: address): bool {
        if (sender == config.admin_addr) {
            true
        } else {
            if (object::is_object(@meme_factory)) {
                let obj = object::address_to_object<ObjectCore>(@meme_factory);
                object::is_owner(obj, sender)
            } else {
                false
            }
        }
    }

    fun check_mint_limit_and_update_mint_tracker(
        sender: address,
        meme_obj: Object<Metadata>,
        amount: u64,
    ) acquires MemeConfig {
        let mint_limit = get_mint_limit(meme_obj);
        if (option::is_some(&mint_limit)) {
            let old_amount = get_current_minted_amount(meme_obj, sender);
            assert!(
                old_amount + amount <= *option::borrow(&mint_limit),
                EMINT_LIMIT_REACHED,
            );
            let meme_config = borrow_global_mut<MemeConfig>(object::object_address(&meme_obj));
            let mint_limit = option::borrow_mut(&mut meme_config.mint_limit);
            table::upsert(&mut mint_limit.mint_tracker, sender, old_amount + amount)
        }
    }

    fun mint_meme_internal(
        sender: &signer,
        meme_obj: Object<Metadata>,
        amount: u64,
        total_mint_fee: u64,
    ) acquires MemeController {
        let sender_addr = signer::address_of(sender);
        let meme_obj_addr = object::object_address(&meme_obj);

        let meme_controller = borrow_global<MemeController>(meme_obj_addr);
        primary_fungible_store::mint(&meme_controller.mint_ref, sender_addr, amount);

        event::emit(MintMemeEvent {
            meme_obj,
            amount,
            recipient_addr: sender_addr,
            total_mint_fee,
        });
    }

    fun pay_for_mint(
        sender: &signer,
        total_mint_fee: u64
    ) acquires Config {
        if (total_mint_fee > 0) {
            let config = borrow_global<Config>(@meme_factory);
            aptos_account::transfer(sender, config.mint_fee_collector_addr, total_mint_fee)
        }
    }

    // ================================= Tests ================================== //

    #[test_only]
    use aptos_framework::aptos_coin;
    #[test_only]
    use aptos_framework::coin;
    #[test_only]
    use aptos_framework::account;

    #[test(aptos_framework = @0x1, sender = @meme_factory)]
    fun test_happy_path(
        aptos_framework: &signer,
        sender: &signer,
    ) acquires Registry, MemeController, Config, MemeConfig {
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        let sender_addr = signer::address_of(sender);
        init_module(sender);

        // Create meme coin
        create_meme(
            sender,
            option::some(1000000000),
            string::utf8(b"DEGEN"),
            string::utf8(b"DGN"),
            8,
            string::utf8(b"https://example.com/degen.png"),
            string::utf8(b"https://example.com"),
            option::none(),
            option::none(),
            option::some(1000)
        );

        let registry = get_registry();
        let meme = *vector::borrow(&registry, 0);

        // Set degen metrics
        set_moon_score(sender, meme, 95);
        set_rug_risk(sender, meme, 20);
        enable_holder_rewards(sender, meme);

        // Verify degen metrics
        let (moon_score, rug_risk, holder_rewards_enabled) = get_degen_metrics(meme);
        assert!(moon_score == 95, 1);
        assert!(rug_risk == 20, 2);
        assert!(holder_rewards_enabled == true, 3);

        // Test minting
        account::create_account_for_test(sender_addr);
        coin::register<aptos_coin::AptosCoin>(sender);
        mint_meme(sender, meme, 100);
        assert!(primary_fungible_store::balance(sender_addr, meme) == 100, 4);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }
} 