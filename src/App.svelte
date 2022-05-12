<script>
	let total = 0;
	let console = '';
	let state = null;

	function resolveState() {
		switch (state) {
			case 'add':
				total += parseFloat(console);
				console = 0;
				break;
			case 'subtract':
				total -= parseFloat(console);
				console = 0;
				break;
			case 'multiply':
				total *= parseFloat(console);
				console = 0;
				break;
			case 'divide':
				total /= parseFloat(console);
				console = 0;
				break;
			default:
				total = parseFloat(console);
				console = 0;
				break;
		}
	}
	function setOperation(operation) {
		resolveState();
		state = operation;
	}
	function setValue(value) {
		if (console.toString() == '0' || state == 'equal') {
			console = '';
		}
		if (state == 'equal') {
			state = null;
		}
		if (value == 'C') {
			total = 0;
			state = null;
			console = '';
			return;
		}
		console = console + value;
	}
	function equal() {
		resolveState();
		console = total;
		state = 'equal';
	}
</script>

<style>
	h1 {
		text-align: center;
		margin-top: 5rem;
	}
	.calculator {
		position: absolute;
		top: 50%;
		left: 50%;
		max-width: 300px;
		padding: 10px;
		background-color: rgb(203, 203, 203);
		border: 1px solid #eee;
		box-shadow: 12px 12px 20px rgb(63, 63, 63);
		transform: translate(-50%, -50%);
	}
	button {
		font-weight: bold;
		box-shadow: 2px 2px 5px rgb(84, 84, 84);
	}
	.calculator input {
		text-align: right;
		width: 100%;
		padding: 20px;
		background-color: rgb(244, 244, 244);
		font-size: 20px;
		outline: none;
	}
	.calculator .buttons {
		display: flex;
		flex-wrap: wrap;
	}
	.calculator .buttons .operations {
		display: flex;
		justify-content: space-between;
		width: 100%;
	}
	.calculator .buttons .operations button {
		width: 24%;
	}
	.calculator .buttons .numbers {
		width: 75%;
	}
	.calculator .buttons .numbers > div {
		display: flex;
		justify-content: space-between;
	}
	.calculator .buttons .numbers > div button {
		width: 32%;
	}
	.calculator .equal {
		flex: 1;
	}
	.calculator .equal button {
		height: 95%;
		width: 95%;
		margin-left: 5%;
		background: #ffcb31;
	}
	.calculator button {
		outline: none;
	}
</style>

<h1>Svelte Calculator</h1>
<div class="calculator">
	<input type="text" bind:value={console} readonly="true" />
	<div class="buttons">
		<div class="operations">
			<button
				on:click={() => {
					setOperation('add');
				}}
			>
				+
			</button>
			<button
				on:click={() => {
					setOperation('subtract');
				}}
			>
				-
			</button>
			<button
				on:click={() => {
					setOperation('multiply');
				}}
			>
				&times;
			</button>
			<button
				on:click={() => {
					setOperation('divide');
				}}
			>
				&divide;
			</button>
		</div>
		<div class="numbers">
			<div>
				<button
					on:click={() => {
						setValue(7);
					}}
				>
					7
				</button>
				<button
					on:click={() => {
						setValue(8);
					}}
				>
					8
				</button>
				<button
					on:click={() => {
						setValue(9);
					}}
				>
					9
				</button>
			</div>
			<div>
				<button
					on:click={() => {
						setValue(4);
					}}
				>
					4
				</button>
				<button
					on:click={() => {
						setValue(5);
					}}
				>
					5
				</button>
				<button
					on:click={() => {
						setValue(6);
					}}
				>
					6
				</button>
			</div>
			<div>
				<button
					on:click={() => {
						setValue(1);
					}}
				>
					1
				</button>
				<button
					on:click={() => {
						setValue(2);
					}}
				>
					2
				</button>
				<button
					on:click={() => {
						setValue(3);
					}}
				>
					3
				</button>
			</div>
			<div>
				<button
					on:click={() => {
						setValue(0);
					}}
				>
					0
				</button>
				<button
					on:click={() => {
						setValue('.');
					}}
				>
					.
				</button>
				<button
					on:click={() => {
						setValue('C');
					}}
				>
					C
				</button>
			</div>
		</div>
		<div class="equal">
			<button on:click={equal}> = </button>
		</div>
	</div>
</div>
