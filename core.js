// Opcode patterns
const CC=0x03;
const BBB=0x1c;
const AAA=0xe0;

// Memory usage bitfield types
const UNUSED=0x00
const READ=0x01;
const WRITE=0x02;
const CODE=0x04;

// CPU flags
const CFLAG=0x01; // Carry
const ZFLAG=0x02; // Zero
const IFLAG=0x04; // Interrupt disable
const DFLAG=0x08; // Decimal mode
const BFLAG=0x10; // Break command
const XFLAG=0x20; // UNKNOWN
const VFLAG=0x40; // Overflow
const NFLAG=0x80; // Negative

// Stack
const STACK=0x0100;

// CPU registers (location after memory)
const AREG=0xffff+2; // accumulator
const XREG=0xffff+3; // X index
const YREG=0xffff+4; // Y index
const SREG=0xffff+5; // stack

var core={
  // Is the core running?
  running:false,

  // Memory
  memory:new Uint8Array(0xffff+1+4+1),

  // Program counter
  pc:0,

  // CPU flags
  flags:0,

  ci:0,
  addr:0,
  aaa:0, // opcode
  bbb:0, // addressing mode
  cc:0, // opcode table

  CLEARFLAG:function(x)
  {
    this.flags&=(~x);
  },

  SETFLAG:function(x)
  {
   this.flags|=x;
  },

  // Push a byte onto the stack
  push:function(topush)
  {
    if (this.memory[this.memory[SREG]]==0x01)
    {
      console.log("STACK OVERFLOW");
      this.running=false;
      return;
    }

    this.memory[STACK+this.memory[SREG]]=topush;
    this.memory[SREG]--;
  },

  // Pop a byte from the stack
  pop:function()
  {
    if (this.memory[SREG]==0xff)
    {
      console.log("STACK UNDERFLOW");
      this.running=false;
      return 0;
    }

    this.memory[SREG]++;
    return (this.memory[STACK+this.memory[SREG]]);
  },

  // Push a word onto the stack
  pushword:function(topush)
  {
    this.push((topush>>8)&0xff);
    this.push(topush&0xff);
  },

  // Pop a word from the stack
  popword:function()
  {
    var retval;

    retval=this.pop();
    retval|=(this.pop()<<8);

    return retval;
  },

  // Update Z N flags
  update_flagsZN:function(value)
  {
    if (value==0x00) this.SETFLAG(ZFLAG); else this.CLEARFLAG(ZFLAG);
    if ((value&0x80)!=0) this.SETFLAG(NFLAG); else this.CLEARFLAG(NFLAG);
  },

  // Update Z V N flags
  update_flagsZVN:function(value)
  {
    if (value==0x00) this.SETFLAG(ZFLAG); else this.CLEARFLAG(ZFLAG);
    if ((value&0x40)!=0) this.SETFLAG(VFLAG); else this.CLEARFLAG(VFLAG);
    if ((value&0x80)!=0) this.SETFLAG(NFLAG); else this.CLEARFLAG(NFLAG);
  },

  // Convert from BCD
  bcd:function(value)
  {
    var retval;

    if ((value&0xf0)<0xA0) retval=((value&0xf0)>>4)*10;
    if ((value&0x0f)<0x0A) retval+=(value&0x0f);

    return retval;
  },

  OSJump:function(addr)
  {
    switch (addr)
    {
      case 0xffe3:
        document.write(String.fromCharCode(this.memory[AREG]));
        break;

      case 0xffee:
        document.write(String.fromCharCode(this.memory[AREG]));
        break;
    }
  },

  // Fully reset the core state
  resetcore:function()
  {
    this.pc=0;
    this.memory[AREG]=0;
    this.memory[XREG]=0;
    this.memory[YREG]=0;
    this.memory[SREG]=0xff;
    this.flags=IFLAG;

    // Clear memory
    for (var i=0; i<this.memory.length; i++)
      this.memory[i]=0;
  },

  // Step a single instruction
  stepcore:function()
  {
    // Fetch current instruction
    this.ci=this.memory[this.pc];

    // Move program counter on
    this.pc=(this.pc+1)&0xffff;

    // Decode current instruction
    this.aaa=(this.ci&AAA)>>5;
    this.bbb=(this.ci&BBB)>>2;
    this.cc=(this.ci&CC);

    // Execute instruction
    if ((this.ci&0x0f)==0x08) // Single byte instructions
    {
      switch (this.ci)
      {
        case 0x08:
          console.log("PHP"); // * Push flags onto stack
          this.push(this.flags|0x30); // (0x30 from beebem)
          break;

        case 0x18: // * Clear CARRY flag
          console.log("CLC");
          CLEARFLAG(CFLAG);
          break;

        case 0x28: // * Pull from stack to flags
          console.log("PLP");
          this.flags=this.pop();
          break;

        case 0x38: // * Set CARRY flag
          console.log("SEC");
          SETFLAG(CFLAG);
          break;

        case 0x48: // * Push A onto stack
          console.log("PHA");
          this.push(this.memory[AREG]);
          break;

        case 0x58: // * Clear INTERRUPT (disable) flag (enable interrupts)
          console.log("CLI");
          CLEARFLAG(IFLAG);
          break;

        case 0x68: // * Pull from stack to A
          console.log("PLA");
          this.memory[AREG]=this.pop();
          this.update_flagsZN(this.memory[AREG]);
          break;

        case 0x78: // * Set INTERRUPT (disable) flag (disable interrupts)
          console.log("SEI");
          SETFLAG(IFLAG);
          break;

        case 0x88: // * Decrement Y by 1
          console.log("DEY");
          this.memory[YREG]--;
          this.update_flagsZN(this.memory[YREG]);
          break;

        case 0x98: // * Transfer Y to A
          console.log("TYA");
          this.memory[AREG]=this.memory[YREG];
          this.update_flagsZN(this.memory[AREG]);
          break;

        case 0xa8: // * Transfer A to Y
          console.log("TAY");
          this.memory[YREG]=this.memory[AREG];
          this.update_flagsZN(this.memory[YREG]);
          break;

        case 0xb8: // * Clear OVERFLOW flag
          console.log("CLV");
          CLEARFLAG(VFLAG);
          break;

        case 0xc8: // * Increment Y by 1
          console.log("INY");
          this.memory[YREG]++;
          this.update_flagsZN(this.memory[YREG]);
          break;

        case 0xd8: // * Clear DECIMAL flag
          console.log("CLD");
          CLEARFLAG(DFLAG);
          break;

        case 0xe8: // * Increment X by 1
          console.log("INX");
          this.memory[XREG]++;
          update_flagsZN(this.memory[XREG]);
          break;

        case 0xf8: // * Set BCD flag
          console.log("SED");
          SETFLAG(DFLAG);
          this.running=false;
          return; // TODO
          break;

        default:
          console.log("Unknown opcode 0x"+this.ci.toString(16));
          this.running=false;
          return;
          break;
      }
    }
    else
    if ((this.ci>=0x80) && ((this.ci&0x0f)==0x0a)) // Other single byte instructions
    {
      switch (this.ci)
      {
        case 0x8a: // * Transfer X to A
          console.log("TXA");
          this.memory[AREG]=this.memory[XREG];
          this.update_flagsZN(this.memory[AREG]);
          break;

        case 0x9a: // * Transfer X to stackpointer
          console.log("TXS");
          this.memory[SREG]=this.memory[XREG];
          break;

        case 0xaa: // * Transfer A to X
          console.log("TAX");
          this.memory[XREG]=this.memory[AREG];
          this.update_flagsZN(this.memory[XREG]);
          break;

        case 0xba: // * Transfer stackpointer to X
          console.log("TSX");
          this.memory[XREG]=this.memory[SREG];
          this.update_flagsZN(this.memory[XREG]);
          break;

        case 0xca: // * Decrement X by 1
          console.log("DEX");
          this.memory[XREG]--;
          this.update_flagsZN(this.memory[XREG]);
          break;

        case 0xea: // * No operation
          console.log("NOP");
          break;

        default:
          console.log("Unknown opcode 0x"+this.ci.toString(16));
          this.running=false;
          return;
          break;
      }
    }
    else
    if ((this.ci&0x1f)==0x10) // Branch instructions
    {
      this.addr=this.memory[this.pc++];
      if (this.addr>=0x80) this.addr-=0x100;

      console.log("if ");
      switch ((this.ci&0xc0)>>6)
      {
        case 0x00: // * Branch on NEGATIVE (BMI/BPL)
          console.log("NEG");
          if ((this.flags & NFLAG)==((this.ci&0x20)<<2)) this.pc+=this.addr;
          break;

        case 0x01: // * Branch on OVERFLOW (BVC/BVS)
          console.log("OVR");
          if ((this.flags & VFLAG)==((this.ci&0x20)<<1)) this.pc+=this.addr;
          break;

        case 0x02: // * Branch on CARRY (BCC/BCS)
          console.log("CRY");
          if ((this.flags & CFLAG)==((this.ci&0x20)>>5)) this.pc+=this.addr;
          break;

        case 0x03: // * Branch on ZERO (BEQ/BNE)
          console.log("ZER");
          if ((this.flags & ZFLAG)==((this.ci&0x20)>>4)) this.pc+=this.addr;
          break;

        default:
          console.log("Unknown branch 0x"+this.ci.toString(16));
          this.running=false;
          return;
          break;
      }
      console.log("="+((this.ci&0x20)>>5)+" then branch "+this.addr);
    }
    else
    if (this.ci==0x00) // * Simulate interrupt request IRQ
    {
      console.log("BRK");
      this.pc++;
      this.pushword(this.pc-1);
      this.push(this.flags|BFLAG);
      this.pc=this.memory[0xffee]|(this.memory[0xffff]<<8);
      this.running=false;
      return;
    }
    else
    if (this.ci==0x20) // * Jump to subroutine
    {
      this.addr=this.memory[this.pc++];
      this.addr=(this.memory[this.pc++]<<8)+this.addr;

      console.log("JSR abs 0x"+this.addr.toString(16));
      if (this.addr>=0x8000)
      {
        console.log(" ");
        this.OSJump(this.addr);
      }
      else
      {
        this.pushword(this.pc-1);
        this.pc=this.addr;
      }
    }
    else
    if (this.ci==0x40) // * Return from interrupt
    {
      console.log("RTI");
      this.flags=this.pop();
      this.pc=this.popword();
    }
    else
    if (this.ci==0x60) // * Return from subroutine
    {
      console.log("RTS");
      this.pc=this.popword()+1;
    }
    else
    {
      var src;
      var result;

      // Process instructions from standard opcode tables
      switch (this.cc)
      {
        case 0x00:
          // Process addressing mode
          switch (this.bbb)
          {
            case 0x00: // #immediate
              src=this.pc++;
              break;

            case 0x01: // zero page
              src=this.memory[this.pc++];
              break;

            case 0x03: // absolute
              src=this.memory[this.pc++];
              src=(this.memory[this.pc++]<<8)+src;
              break;

            case 0x05: // zero page,X
              src=this.memory[this.pc++]+this.memory[XREG];
              break;

            case 0x07: // absolute,X
              src=this.memory[this.pc++];
              src=(this.memory[this.pc++]<<8)+src+this.memory[XREG];
              break;

            default:
              console.log("Unknown A addressing mode 0x"+this.bbb.toString(16));
              this.running=false;
              return;
              break;
          }

          // Process instruction
          switch (this.aaa)
          {
            case 0x01: // * Test bits in A with M
              console.log("BIT");
              result=this.memory[AREG] & this.memory[src];
              if ((result&0x40)!=0x00) this.SETFLAG(VFLAG); else this.CLEARFLAG(VFLAG);
              this.update_flagsZN(result);
              break;

            case 0x02: // * Goto address absolute
              console.log("JMP abs 0x"+this.addr.toString(16));
              if (this.addr>=0x8000)
              {
                this.OSJump(this.addr);

                this.pc=this.popword()+1; // The OS will RTS eventually
              }
              else
                this.pc=this.addr;
              break;

            case 0x03: // * Goto address indirect
              console.log("JMP ind (0x"+this.addr.toString(16)+")");
              this.addr=this.memory[this.addr]|(this.memory[this.addr+1]<<8);
              if (this.addr>=0x8000)
              {
                this.OSJump(this.addr);

                this.pc=this.popword()+1; // The OS will RTS eventually
              }
              else
                this.pc=this.addr;
              break;

            case 0x04: // * Store Y in memory
              console.log("STY");
              this.memory[src]=this.memory[YREG];
              break;

            case 0x05: // * Load Y with memory
              console.log("LDY");
              this.memory[YREG]=this.memory[src];
              this.update_flagsZN(this.memory[YREG]);
              break;

            case 0x06: // * Compare Y with memory
              console.log("CPY");
              result=(this.memory[YREG]-this.memory[src]);
              if (this.memory[YREG]>=this.memory[src]) this.SETFLAG(CFLAG); else this.CLEARFLAG(CFLAG);
              this.update_flagsZN(result);
              break;

            case 0x07: // * Compare X with memory
              console.log("CPX");
              result=(this.memory[XREG]-this.memory[src]);
              if (this.memory[XREG]>=this.memory[src]) this.SETFLAG(CFLAG); else this.CLEARFLAG(CFLAG);
              this.update_flagsZN(result);
              break;

            default:
              console.log("Unknown opcode "+this.ci.toString(16)+" in table "+this.cc.toString(16));
              this.running=false;
              return;
              break;
          }
          break;

        case 0x01: // Most common instructions
          // Process addressing mode
          switch (this.bbb)
          {
            case 00: // (zero page,X) = indexed indirect
              src=this.memory[this.pc++];
              src=this.memory[src+this.memory[XREG]];
              break;

            case 01: // zero page
              src=this.memory[this.pc++];
              break;

            case 02: // #immediate
              src=this.pc++;
              break;

            case 03: // absolute
              src=this.memory[this.pc++];
              src=(this.memory[this.pc++]<<8)+src;
              break;

            case 04: // (zero page),Y = indirect indexed
              src=this.memory[this.pc++];
              src=(this.memory[src+1]<<8)+this.memory[src];
              src+=this.memory[YREG];
              break;

            case 05: // zero page,X
              src=this.memory[this.pc++]+this.memory[XREG];
              break;

            case 06: // absolute,Y
              src=this.memory[this.pc++];
              src=(this.memory[this.pc++]<<8)+src;
              src+=this.memory[YREG];
              break;

            case 07: // absolute,X
              src=this.memory[this.pc++];
              src=(this.memory[this.pc++]<<8)+src;
              src+=this.memory[XREG];
              break;

            default:
              console.log("Unknown B addressing mode 0x"+this.bbb.toString(16));
              this.running=false;
              return;
              break;
          }

          // Process instruction
          switch (this.aaa)
          {
            case 0x00: // * Bitwise-OR A with memory
              console.log("ORA");
              this.running=false;
              return;
              break;

            case 0x01: // * Bitwise-AND A with memory
              console.log("AND");
              this.running=false;
              return;
              break;

            case 0x02: // * Bitwise-XOR A with memory
              console.log("EOR");
              this.running=false;
              return;
              break;

            case 0x03: // * Add memory to A with carry
              console.log("ADC");
              this.running=false;
              return;
              break;

            case 0x04: // * Store A in memory
              console.log("STA");
              this.memory[src]=this.memory[AREG];
              break;

            case 0x05: // * Load A with memory
              console.log("LDA");
              this.memory[AREG]=this.memory[src];
              this.update_flagsZN(this.memory[AREG]);
              break;

            case 0x06: // * Compare A with memory
              console.log("CMP");
              this.running=false;
              return;
              break;

            case 0x07: // * Subtract memory from A with borrow
              console.log("SBC");
              this.running=false;
              return;
              break;

            default:
              console.log("Unknown opcode "+this.ci.toString(16)+" in table "+this.cc.toString(16));
              this.running=false;
              return;
              break;
          }
          break;

        case 0x02:
console.log("TODO "+this.cc.toString(16));
this.running=false;
return;
          break;

        default:
          console.log("Unknown opcode table 0x"+this.cc.toString(16)+" for instruction 0x"+this.ci.toString(16));
          this.running=false;
          return;
          break;
      }
    }
  },

};

function rafcallback(timestamp)
{
  core.stepcore();

  if (core.running)
    window.requestAnimationFrame(rafcallback);
}

function launchcore()
{
  var lp=0x2000;

  core.resetcore();

  // Load test code
  core.memory[lp++]=0xa9; // LDA #0x16
  core.memory[lp++]=0x16; //

  core.memory[lp++]=0x20; // JSR 0xFFEE
  core.memory[lp++]=0xee; //
  core.memory[lp++]=0xff; //

  core.memory[lp++]=0xa9; // LDA #0x07
  core.memory[lp++]=0x07; //

  core.memory[lp++]=0x20; // JSR 0xFFEE
  core.memory[lp++]=0xee; //
  core.memory[lp++]=0xff; //

  core.memory[lp++]=0xa9; // LDA #0x1F
  core.memory[lp++]=0x1f; //

  core.memory[lp++]=0x85; // STA #0x70
  core.memory[lp++]=0x70; //

  core.memory[lp++]=0xa9; // LDA #0x20
  core.memory[lp++]=0x20; //

  core.memory[lp++]=0x85; // STA 0x71
  core.memory[lp++]=0x71; //

  core.memory[lp++]=0xa0; // LDY 0x00
  core.memory[lp++]=0x00; //

  core.memory[lp++]=0xb1; // LDA (0x70),Y
  core.memory[lp++]=0x70; //

  core.memory[lp++]=0xf0; // BEQ 0x06
  core.memory[lp++]=0x06; //

  core.memory[lp++]=0x20; // JSR 0xFFE3
  core.memory[lp++]=0xe3; //
  core.memory[lp++]=0xff; //

  core.memory[lp++]=0xc8; // INY

  core.memory[lp++]=0xd0; // BNE 0xF6 (-10)
  core.memory[lp++]=0xf6; //

  core.memory[lp++]=0x60; // RTS

  core.memory[lp++]=0x48; // H
  core.memory[lp++]=0x65; // e
  core.memory[lp++]=0x6c; // l
  core.memory[lp++]=0x6c; // l
  core.memory[lp++]=0x6f; // o
  core.memory[lp++]=0x20; // " "
  core.memory[lp++]=0x36; // 6
  core.memory[lp++]=0x35; // 5
  core.memory[lp++]=0x30; // 0
  core.memory[lp++]=0x32; // 2
  core.memory[lp++]=0x20; // " "
  core.memory[lp++]=0x77; // w
  core.memory[lp++]=0x6f; // o
  core.memory[lp++]=0x72; // r
  core.memory[lp++]=0x6c; // l
  core.memory[lp++]=0x64; // d
  core.memory[lp++]=0x21; // !
  core.memory[lp++]=0x0d; // CR
  core.memory[lp++]=0x00; // NULL

  core.pc=0x2000;
  core.running=true;
  window.requestAnimationFrame(rafcallback);
}

launchcore();
